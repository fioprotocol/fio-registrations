require('dotenv').config({
  path: require('path').resolve(process.cwd(), '.env-server')
})

let debug = require('debug')('fio:process-event')
const trace = require('./trace-filter')(() => debug, extend => debug = extend)

const db = require('./db/models');
const {Sequelize, sequelize} = db
const {Op} = Sequelize

const { saveRegistrationsSearchItem, checkCreatedBcTrxEvents } = require('./registrations-search-util')

const {Fio, Ecc} = require('@fioprotocol/fiojs')
const {PrivateKey} = Ecc

const {FioApi} = require('./api')
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY
const walletPublicKey = PrivateKey(walletPrivateKey).toPublic().toString('FIO')
const chainEndpoint = process.env.CHAIN_ENDPOINT
const chainId = process.env.CHAIN_ID
const actor = Fio.accountHash(walletPublicKey)

const fio = new FioApi(chainEndpoint, {
  broadcast: false, // Access to the transaction ID before broadcast
  privateKeys: [walletPrivateKey],
  authorization: [{actor, permission: 'active'}],
  chainId
})

async function all() {
  // pending => success or expire
  await trace({checkIrreversibility})()
    .catch(err => console.error(err))

  // expire => retry or review
  await trace({expireRetry})(3)
    .catch(err => console.error(err))

  // no status or retry => pending or review
  await trace({broadcastPaidNeedingAccounts})()
    .catch(err => console.error(err))
}

const regdomain = async (domain, ownerPublic, tpid, walletActor = '', walletPermission = '') => {
  const maxFee = await fio.getFeeDomain(actor)
  const options = {}
  if (walletActor && walletPermission) {
    // options.authorization = [{
    //   actor: walletActor,
    //   permission: walletPermission
    // }]
    // options.actor = walletActor
  }
  return fio.registerDomain({
    domain,
    ownerPublic,
    maxFee,
    tpid,
    actor
  }, options)
}

const regaddress = async (address, ownerPublic, tpid, walletActor = '', walletPermission = '') => {
  const maxFee = await fio.getFeeAddress(actor)
  const options = {}
  if (walletActor && walletPermission) {
    options.authorization = [{
      actor: walletActor,
      permission: walletPermission
    }]
    options.actor = walletActor
  }
  return fio.registerAddress({
    address,
    ownerPublic,
    maxFee,
    tpid,
    actor
  }, options)
}

/**
  <h4>paid accounts with no status or retry => pending or review</h4>

  Take paid accounts with no blockchain transaction (no status) or paid
  accounts with a "retry" status and broadcast.
*/
async function broadcastPaidNeedingAccounts() {
  const newRegs = await getPaidNeedingAccounts()

  return Promise.all(newRegs.map(newReg =>
    broadcastNewAccount(newReg)))
}

async function getPaidNeedingAccounts() {
  const [newRegs] = await sequelize.query(`
    WITH last AS (
        select max(bte.id) over (partition by account_id) mid, account_id
            from blockchain_trx bt
            left outer join blockchain_trx_event bte on bte.blockchain_trx_id = bt.id
            group by bte.id, account_id
    ), acc_payer AS (
        select account_id
            from account_pay ap
            inner join account_pay_event ape on ape.account_pay_id = ap.id
            where ape.pay_status = 'success'
    ) select distinct a.id account_id,
                      a.address,
                      a.domain,
                      a.owner_key,
                      w.tpid,
                      w.actor,
                      w.permission
        from account a
            inner join acc_payer on acc_payer.account_id = a.id
            left join last on last.account_id = acc_payer.account_id
            left join blockchain_trx_event bte on bte.id = last.mid
            left join wallet w on a.wallet_id = w.id
        where last.account_id is null OR bte.trx_status = 'retry'
        order by a.id;
  `)
  return newRegs
}

async function getAccountsByDomainsAndStatus(walletId, domains = [], statuses = ['success', 'pending']) {
  const domainWhere = domains.length ? ` and a.domain in (${domains.map(domain => `'${domain}'`).join(',')}) ` : ''
  const statusesWhere = statuses.length > 1 ? ` (${statuses.map(status => `bte.trx_status = '${status}'`).join(' OR ')}) ` : ` bte.trx_status = '${status}' `
  const [accounts] = await sequelize.query(`
  WITH m AS (
    select max(bte.id) mid, bt.account_id
      from blockchain_trx bt
               join blockchain_trx_event bte on bte.blockchain_trx_id = bt.id
      where ${statusesWhere}
      group by bt.account_id
    )
    select a.domain, count(m.mid) accounts
    from account a
             join m on m.account_id = a.id
    where a.wallet_id = ${walletId}
      ${domainWhere}
    group by a.domain
  `)

  return accounts
}

async function getRegisteredAmountForOwner(walletId, owner_key, domains = [], isFree = false, statuses = ['success', 'pending']) {
  const domainWhere = domains.length ? ` and a.domain in (${domains.map(domain => `'${domain}'`).join(',')}) ` : ''
  const statusesWhere = statuses.length > 1 ? ` (${statuses.map(status => `le.trx_status = '${status}'`).join(' OR ')}) ` : ` le.trx_status = '${status}' `
  const buyPriceWhere = isFree ? ` and a.owner_key = '${owner_key}' ` : ''

  const [res] = await sequelize.query(`
    select count(distinct a.id) as accounts
    from account a
    join account_pay ap on ap.account_id = a.id
    join blockchain_trx t on t.account_id = a.id
    join blockchain_trx_event le on le.id = (
      select max(le.id)
      from blockchain_trx lt
      join blockchain_trx_event le on le.blockchain_trx_id = lt.id
      where lt.account_id = a.id
    )
    where a.wallet_id=${walletId} and
      ${statusesWhere}
      ${domainWhere}
      ${buyPriceWhere}
      and ap.buy_price = 0
    group by
      a.wallet_id
  `)

  return res[0] && res[0].accounts ? res[0].accounts : 0
}

async function getRegisteredAmountByIp(walletId, ip, isFree = false, statuses = ['success', 'pending']) {
  let amount = 0
  const statusesWhere = statuses.length > 1 ? ` (${statuses.map(status => `le.trx_status = '${status}'`).join(' OR ')}) ` : ` le.trx_status = '${status}' `
  const freeWhere = isFree ? ` and ap.pay_source = 'free' ` : ''

  const [res] = await sequelize.query(`
    select count(distinct a.id) as accounts
    from account a
    join account_pay ap on ap.account_id = a.id
    join blockchain_trx t on t.account_id = a.id
    join blockchain_trx_event le on le.id = (
      select max(le.id)
      from blockchain_trx lt
      join blockchain_trx_event le on le.blockchain_trx_id = lt.id
      where lt.account_id = a.id
    )
    where a.wallet_id=${walletId} and
      ${statusesWhere}
      and a.ip = '${ip}'
      ${freeWhere}
    group by
      a.wallet_id
  `)

  amount = res[0] && res[0].accounts ? parseInt(res[0].accounts) : 0

  if (isFree) {
    const [regRequests] = await sequelize.query(`
      select count(distinct a.id) as accounts
      from account a
      join account_pay ap on ap.account_id = a.id
      where a.wallet_id=${walletId}
        and a.ip = '${ip}'
        ${freeWhere}
        and (select id from blockchain_trx where blockchain_trx.account_id = a.id) IS null
      group by a.wallet_id;
  `)
    amount += regRequests[0] && regRequests[0].accounts ? parseInt(regRequests[0].accounts) : 0
  }

  return amount
}

/**
  <h4>any or no status => pending or review</h4>

  Try to broadcast a new regaddress or regdomain transaction.  Creates new
  blockchain_trx and blockchain_trx_event records in the "pending" (worked)
  or "review" (error broadcasting) status.
*/
async function broadcastNewAccount({
  account_id,
  domain,
  address,
  owner_key,
  tpid,
  actor,
  permission
}) {
  const account = (address ? address + '@' : '') + domain
  const regAction = address ?
    await regaddress( account, owner_key, tpid, actor, permission ) :
    await regdomain( domain, owner_key, tpid, actor, permission )

  let transaction, trx_id, expiration

  try {
    transaction = await fio.transaction([regAction])
    trx_id = await fio.transactionId(transaction)
    expiration = transaction.expiration
  } catch(error) {
    const dbTrx = await db.BlockchainTrx.create({
      type: 'register',
      account_id
    })

    const newBcTrxEvent = await db.BlockchainTrxEvent.create({
      trx_status: 'review',
      blockchain_trx_id: dbTrx.id,
      trx_status_notes: error.message
    })
    // Updating RegistrationsSearch table record
    saveRegistrationsSearchItem(
      {
        blockchain_trx_id: dbTrx.id,
        blockchain_trx_event_id: newBcTrxEvent.id,
        trx_status: newBcTrxEvent.trx_status
      },
      {
        account_id
      },
      {
        account_id,
        dbTrx,
        newBcTrxEvent
      }
    )
    return
  }

  if(debug.enabled) {
    debug({trx_id, expiration})
  }

  try {
    const bc = await fio.broadcast(transaction)

    if(bc.processed) {
      // debug(JSON.stringify(bc.processed, null, 4));

      const dbTrx = await db.BlockchainTrx.create({
        type: 'register',
        expiration: expiration + 'Z',
        trx_id,
        block_num: bc.processed.block_num,
        block_time: bc.processed.block_time + 'Z',
        account_id
      })

      const newBcTrxEvent = await db.BlockchainTrxEvent.create({
        trx_status: 'pending',
        blockchain_trx_id: dbTrx.id
      })
      // Updating RegistrationsSearch table record
      saveRegistrationsSearchItem(
        {
          blockchain_trx_id: dbTrx.id,
          blockchain_trx_event_id: newBcTrxEvent.id,
          trx_status: newBcTrxEvent.trx_status
        },
        {
          account_id
        },
        {
          account_id,
          dbTrx,
          newBcTrxEvent
        }
      )
      return
    }

    // ! bc.processed
    const fieldError = Array.isArray(bc.fields) ?
      bc.fields.find(f => f.error) : null

    const notes = fieldError ? fieldError.error : JSON.stringify(bc)

    if(
      notes === 'FIO domain already registered' ||
      notes === 'FIO address already registered'
    ) {
      const dbTrx = await db.BlockchainTrx.create({
        type: 'register',
        account_id
      })

      const newBcTrxEvent = await db.BlockchainTrxEvent.create({
        trx_status: 'review',
        trx_status_notes: notes,
        blockchain_trx_id: dbTrx.id
      })
      // Updating RegistrationsSearch table record
      saveRegistrationsSearchItem(
        {
          blockchain_trx_id: dbTrx.id,
          blockchain_trx_event_id: newBcTrxEvent.id,
          trx_status: newBcTrxEvent.trx_status
        },
        {
          account_id
        },
        {
          account_id,
          dbTrx,
          newBcTrxEvent
        }
      )
    } else {
      const dbTrx = await db.BlockchainTrx.create({
        type: 'register',
        expiration: expiration + 'Z',
        trx_id,
        account_id
      })

      const newBcTrxEvent = await db.BlockchainTrxEvent.create({
        trx_status: 'review',
        trx_status_notes: notes,
        blockchain_trx_id: dbTrx.id
      })
      // Updating RegistrationsSearch table record
      saveRegistrationsSearchItem(
        {
          blockchain_trx_id: dbTrx.id,
          blockchain_trx_event_id: newBcTrxEvent.id,
          trx_status: newBcTrxEvent.trx_status
        },
        {
          account_id
        },
        {
          account_id,
          dbTrx,
          newBcTrxEvent
        }
      )
    }
  } catch(error) {
    console.error(error);
  }
}

var nextCheck = 0

/**
  <h4>pending => success or expire</h4>

  A transaction expires when an irreversible block's timestamp becomes
  greater than the transaction's expiration.  An expiration equal to
  the block's timestamp has not expired.

  @see controller.cpp validate_expiration
*/
async function checkIrreversibility() {
  if(Date.now() < nextCheck) {
    return
  }

  nextCheck = 0

  const [pendingAccounts] = await db.sequelize.query(`
    with notpend as (
        -- get highest event that is not pending
        select max(id) other, max(blockchain_trx_id) blockchain_trx_id
        from blockchain_trx_event be
        where be.trx_status != 'pending'
        group by blockchain_trx_id
    ),
         pend as (
             select max(id) pending, be.blockchain_trx_id
             from blockchain_trx_event be
                      -- outer join eliminates rows where highest event is not pending
                      full outer join notpend on notpend.blockchain_trx_id = be.blockchain_trx_id
             where be.trx_status = 'pending'
               and notpend.other is null
             group by be.blockchain_trx_id
         )
    SELECT a.id,
           a.address,
           a.domain,
           a.owner_key,
           bt.expiration,
           bt.block_time,
           bt.id         AS btid,
           pend.pending
    FROM account a
             INNER JOIN blockchain_trx bt
                        ON a.id = bt.account_id
             inner join pend on pend.blockchain_trx_id = bt.id
  `)

  if(!pendingAccounts.length) {
    return
  }

  // Singleton / Last-irreversible-block (lib) timestamp
  const getLibTime = async () => {
    if(libTime) {
      return libTime
    }
    const chainInfo = await fio.getInfo()
    const { last_irreversible_block_num } = chainInfo
    const {timestamp} = await fio.getBlock(last_irreversible_block_num)
    return libTime = new Date(timestamp + 'Z').getTime()
  }
  let libTime

  const promises = []
  const accountsWithUpdatedEvents = []
  for (let account of pendingAccounts) {
    const {id, address, domain, owner_key, expiration, block_time, btid} = account

    const libTime = await getLibTime()
    const trxBlockTime = new Date(block_time).getTime()
    const trxExpiration = new Date(expiration).getTime()

    const irreversible = libTime >= trxBlockTime
    const expired = libTime >= trxExpiration

    nextCheck = Date.now() + Math.min(
      nextCheck === 0 ? Number.MAX_SAFE_INTEGER : nextCheck,
      trxBlockTime - libTime,
      trxExpiration - libTime,
    )

    if(debug.enabled) {
      debug('checkIrreversibility', {
        irreversible, expired,
        last_irreversible_block: new Date(libTime).toLocaleString(),
        trx_block_time: new Date(trxBlockTime).toLocaleString(),
        expiration: new Date(trxExpiration).toLocaleString(),
      })
    }

    if(irreversible) {

      // getNames is a hack, get_transaction API call was not available
      const names = await fio.getNames(owner_key)
      const found = nameExists(names, address, domain)

      if(debug.enabled) {
        debug('checkIrreversibility',
          JSON.stringify({ found, address, domain }, null, 2)
        )
      }

      if(found) {
        promises.push(
          db.BlockchainTrxEvent.create({
            trx_status: 'success',
            trx_status_notes: 'irreversible',
            blockchain_trx_id: btid
          })
        )
        accountsWithUpdatedEvents[id] = true
      } else {
        if(expired) {
          promises.push(
            db.BlockchainTrxEvent.create({
              trx_status: 'expire',
              blockchain_trx_id: btid
            })
          )
          accountsWithUpdatedEvents[id] = true
        }
      }
    }
  }
  const res = await Promise.all(promises)
  // Updating RegistrationsSearch table record
  checkCreatedBcTrxEvents(Object.keys(accountsWithUpdatedEvents))
  return res
}

/**
  <h4>expire => retry or review</h4>

  @arg {number} retry - when retry count is reached creates a "review" status
*/
async function expireRetry(retry = 3) {
  const [res] = await db.sequelize.query(`
    with nx as (
        -- get highest event that is not expired
        select max(id) notexpire, max(blockchain_trx_id) blockchain_trx_id
        from blockchain_trx_event be
        where be.trx_status != 'expire'
        group by blockchain_trx_id
    ),
         ex as (
             -- now get highest expired, and only return if higher than not expired
             select max(id) expire, max(be.blockchain_trx_id) blockchain_trx_id
             from blockchain_trx_event be
                      left join nx on nx.blockchain_trx_id = be.blockchain_trx_id
             where be.trx_status = 'expire'
               and be.id > nx.notexpire
             group by be.blockchain_trx_id
         ),
         r as (
             -- get retry counts
             select count(*) as retries, rt.account_id, re.blockchain_trx_id
             from blockchain_trx rt
                      inner join blockchain_trx_event re on re.blockchain_trx_id = rt.id
                 -- limit to events where most recent is expired
                      inner join ex on ex.blockchain_trx_id = rt.id
             where re.trx_status = 'retry'
             group by rt.account_id, re.blockchain_trx_id
         )
    select t.id as blockchain_trx_id,
           r.retries,
           a.owner_key,
           a.address,
           a.domain
    from blockchain_trx t
             -- find the account id from blockchain_trx
             inner join blockchain_trx_event bte on bte.blockchain_trx_id = t.id
             inner join r on r.blockchain_trx_id = t.id
             inner join account a on t.account_id = a.id
    where r.retries <= :retries
    group by r.retries, t.id, a.owner_key, a.address, a.domain
  `, {replacements: {retries: retry}})

  const trxEvents = []
  for (let event of res) {
    const {blockchain_trx_id, owner_key, address, domain} = event

    const names = await fio.getNames(owner_key)
    const found = nameExists(names, address, domain)

    if(found) {
      trxEvents.push({
        trx_status: 'success',
        trx_status_notes: 'account found',
        blockchain_trx_id
      })
      continue
    }
    if(event.retries < retry) {
      trxEvents.push({
        trx_status: 'retry',
        trx_status_notes: 'auto-retry',
        blockchain_trx_id
      })
      continue
    }

    trxEvents.push({
      trx_status: 'review',
      trx_status_notes: 'retries failed',
      blockchain_trx_id
    })
  }

  await db.BlockchainTrxEvent.bulkCreate(trxEvents)
  // Updating RegistrationsSearch table record
  checkCreatedBcTrxEvents([], res.map(event => event.blockchain_trx_id))
}

function nameExists(names, address, domain) {
  const isDomain = address === null
  const key1 = isDomain ? 'fio_domains' : 'fio_addresses'
  const key2 = isDomain ? 'fio_domain' : 'fio_address'
  const fullAddress = isDomain ? domain : `${address}@${domain}`

  const found = names[key1] && -1 !== names[key1].findIndex(
    ne => ne[key2] === fullAddress
  )

  return found === undefined ? false : found
}

module.exports = {
  all: trace({all}),
  getPaidNeedingAccounts,
  getAccountsByDomainsAndStatus,
  getRegisteredAmountForOwner,
  getRegisteredAmountByIp,
  broadcastPaidNeedingAccounts,
  broadcastNewAccount,
  checkIrreversibility,
  expireRetry
}
