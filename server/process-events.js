require('dotenv').config({
  path: require('path').resolve(process.cwd(), '.env-server')
})

let debug = require('debug')('fio:process-event')
const trace = require('./trace-filter')(() => debug, extend => debug = extend)

const db = require('./db/models');
const {Sequelize, sequelize} = db
const {Op} = Sequelize
const {trimKeys} = require('./db/helper')

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
    options.authorization = {
      actor: walletActor,
      permission: walletPermission
    }
    options.actor = walletActor
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
    options.authorization = {
      actor: walletActor,
      permission: walletPermission
    }
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
    select distinct
      a.id as account_id,
      a.address,
      a.domain,
      a.owner_key,
      w.tpid,
      w.actor,
      w.permission
      --, a.created, le.trx_status, ae.pay_status
    from account a
    join wallet w on w.id = a.wallet_id
    join account_pay ap on ap.account_id = a.id
    join account_pay_event ae on ae.id = (
      select max(le.id) from account_pay_event le
      where le.account_pay_id = ap.id
    )
    left join blockchain_trx t on t.id = (
      select max(lt.id) from blockchain_trx lt
      where lt.account_id = a.id
    ) and t.type = 'register'
    left join blockchain_trx_event le on le.id = (
      select max(te.id) from blockchain_trx_event te
      where te.blockchain_trx_id = t.id
    )
    where
      (ae.pay_status = 'success' AND le.trx_status IS NULL) OR
      le.trx_status = 'retry'
    order by
      a.id
  `)
  return newRegs
}

async function getAccountsByDomainsAndStatus(walletId, domains = [], statuses = ['success', 'pending']) {
  const domainWhere = domains.length ? ` and a.domain in (${domains.map(domain => `'${domain}'`).join(',')}) ` : ''
  const statusesWhere = statuses.length > 1 ? ` (${statuses.map(status => `le.trx_status = '${status}'`).join(' OR ')}) ` : ` le.trx_status = '${status}' `
  const [accounts] = await sequelize.query(`
    select a.domain, count(distinct a.id) as accounts
    from account a
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
    group by
      a.domain
  `)
  return accounts
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

    await db.BlockchainTrxEvent.create({
      trx_status: 'review',
      blockchain_trx_id: dbTrx.id,
      trx_status_notes: error.message
    })
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

      await db.BlockchainTrxEvent.create({
        trx_status: 'pending',
        blockchain_trx_id: dbTrx.id
      })
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

      await db.BlockchainTrxEvent.create({
        trx_status: 'review',
        trx_status_notes: notes,
        blockchain_trx_id: dbTrx.id
      })
    } else {
      const dbTrx = await db.BlockchainTrx.create({
        type: 'register',
        expiration: expiration + 'Z',
        trx_id,
        account_id
      })

      await db.BlockchainTrxEvent.create({
        trx_status: 'review',
        trx_status_notes: notes,
        blockchain_trx_id: dbTrx.id
      })
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

  const pendingAccounts = await db.Account.findAll({
    attributes: ['address', 'domain', 'owner_key'],
    include: [
      {
        model: db.BlockchainTrx,
        attributes: ['expiration', 'block_time', 'id'],
        where: {
          id: {
            [Op.eq]: sequelize.literal(
              `( select max(t.id) from blockchain_trx t ` +
              `join blockchain_trx_event e on e.blockchain_trx_id = t.id ` +
              `where account_id = "Account"."id" )`)
          }
        },
        include: [
          {
            model: db.BlockchainTrxEvent,
            attributes: ['id'],
            where: {
              trx_status: 'pending',
              id: {
                [Op.eq]: sequelize.literal(
                  `( select max(id) from blockchain_trx_event ` +
                  `where blockchain_trx_id = "BlockchainTrxes"."id")`)
              }
            }
          }
        ],
        where: {
          type: 'register',
        }
      }
    ]
  })

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
  for (let account of pendingAccounts) {
    const {owner_key} = account

    for (let trx of account.BlockchainTrxes) {
      const libTime = await getLibTime()
      const trxBlockTime = new Date(trx.block_time).getTime()
      const trxExpiration = new Date(trx.expiration).getTime()

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
        const {address, domain, owner_key} = account

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
              blockchain_trx_id: trx.id
            })
          )
        } else {
          if(expired) {
            promises.push(
              db.BlockchainTrxEvent.create({
                trx_status: 'expire',
                blockchain_trx_id: trx.id
              })
            )
          }
        }
      }
    }
  }
  return Promise.all(promises)
}

/**
  <h4>expire => retry or review</h4>

  @arg {number} retry - when retry count is reached creates a "review" status
*/
async function expireRetry(retry = 3) {
  const [res] = await db.sequelize.query(`
    select
      t.id as blockchain_trx_id,
      r.retries, --, e.id, e.trx_status,
      a.owner_key, a.address, a.domain
    from blockchain_trx t
    join account a on a.id = t.account_id
    join blockchain_trx_event e on e.id = (
      select max(id) from blockchain_trx_event
      where blockchain_trx_id = t.id
    )
    join (
      select count(*) as retries, rt.account_id
      from blockchain_trx rt
      join blockchain_trx_event re on
        re.blockchain_trx_id = rt.id and
        re.trx_status = 'retry'
      group by
        rt.account_id
    ) as r on r.account_id = t.account_id
    where
      t.type = 'register' and
      e.trx_status = 'expire' and
      t.id = (
        select max(id) from blockchain_trx
        where account_id = t.account_id
      ) and
      r.retries <= :retries
    order by t.id
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
  broadcastPaidNeedingAccounts,
  broadcastNewAccount,
  checkIrreversibility,
  expireRetry
}
