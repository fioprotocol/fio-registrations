/**
  All authenticated routes primarily for the Admin interface excluding
  API only routes.

  @see also ./admin-api.js
*/

const debug = require('debug')('fio:admin')
const assert = require('assert')

const router = require('express').Router();
const handler = require('./handler')
const {trimKeys} = require('../db/helper')

//invite
const plugins = require('../plugins')
const Isemail = require('isemail')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const db = require('../db/models')
const transactions = require('../db/transactions')
const {Sequelize, sequelize} = db
const {Op} = Sequelize

const {PublicKey} = require('@fioprotocol/fiojs').Ecc
const {checkEncrypt, checkDecrypt} = require('../encryption-check')
const { getAccountsByDomainsAndStatus } = require('../process-events')
const { saveRegistrationsSearchItem, fillRegistrationsSearch, getRegSearchRes } = require('../registrations-search-util')
const { generateCsvReport } = require('../services/csv-report')

if(!process.env.TITLE) {
  throw new Error('Required: process.env.TITLE')
}

/** Debit or credit a public key's balance */
router.post('/adjustment', handler(async (req, res) => {
  const {user_id, username} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {publicKey, notes} = req.body
  const amount = Number(req.body.amount)

  assert(publicKey, 'Missing json body: publicKey')
  assert(PublicKey.isValid(publicKey), 'Invalid: publicKey')
  assert(amount !== 0, 'Required non-zero: amount')
  assert(typeof notes === 'string', 'Required json body string: notes')

  const adj = await db.AccountAdj.create({
    created_by: username,
    owner_key: publicKey,
    amount,
    notes
  })

  return res.send({
    success: 'Created',
    created: adj.created,
    amount
  })
}))

router.get('/transactions/:publicKey', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {publicKey} = req.params
  assert(publicKey, 'Missing url parameter: publicKey')
  assert(PublicKey.isValid(publicKey), 'Invalid: publicKey')

  const history = await transactions.history(publicKey)
  res.send({success: history})
}))

router.get('/find/:search/:page?', handler(async (req, res) => {
  const { user_id } = res.state
  if (!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const { search, page = 1 } = req.params
  if (!search || search.trim() === '') {
    return res.status(401).send({error: 'Missing url parameter: search'})
  }

  if (search === 'credits') {
    const credits = await transactions.credits()
    return res.send({success: {credits}})
  }

  let accountWhere = {}, accountPayWhere = {}

  const statusSearch = [
    'pending', 'success', 'expire', 'retry', 'review', 'cancel'
  ].find(status => status === search.toLowerCase())

  if (statusSearch) {
    accountWhere = sequelize.literal(
      `("RegistrationsSearch".pay_status = '${statusSearch}' OR "RegistrationsSearch".trx_status = '${statusSearch}')`
    )
  } else if (PublicKey.isValid(search)) {
    accountWhere.owner_key = search
  } else {
    // address, domain, or processor id
    const noSeparator = search.indexOf('@') === -1

    if (noSeparator) {
      const count = await db.AccountPay.count({ where: { extern_id: search } })
      if (count === 1) {
        accountPayWhere.extern_id = search
      }
    }

    if (!accountPayWhere.extern_id) {
      if (noSeparator) {
        accountWhere[Op.or] = {
          domain: search,
          address: search
        }
      } else {
        const [address, domain = ''] = search.split('@')
        if (address !== '') {
          accountWhere.address = address
        }
        if (domain !== '') {
          accountWhere.domain = domain
        }
      }
    }
  }

  // if(debug.enabled) {
  //   debug('/find/:search', search, {accountWhere, accountPayWhere});
  // }
  const limit = 25
  const offset = limit * (page - 1)
  const { rows, count } = await getRegSearchRes(accountWhere, accountPayWhere, limit, offset)
  const pages = Math.floor(count / limit) + 1

  return res.send({ success: rows, count, pages, page, search })
}))

/**
 * Separate (account pay/blockchain trx) search
 */
router.get('/find-by/:type/:search/:?page', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const { type, search, page = 1 } = req.params
  if (!type || type.trim() === '') {
    return res.status(401).send({error: 'Missing url parameter: type'})
  }
  if (!search || search.trim() === '') {
    return res.status(401).send({error: 'Missing url parameter: search'})
  }

  let accountWhere = {}, accountPayWhere = {}, bcTxWhere = {}, accountPayLitWhere = {}

  const statusSearch = [
    'pending', 'success', 'expire', 'retry', 'review', 'cancel'
  ].find(status => status === search.toLowerCase())

  if (statusSearch) {
    accountPayLitWhere = sequelize.literal(
      `(pay_status = '${statusSearch}')`
    )
    bcTxWhere = sequelize.literal(
      `(trx_status = '${statusSearch}')`
    )
  } else if (PublicKey.isValid(search)) {
    accountWhere.owner_key = search
  } else {
    // address, domain, or processor id
    const noSeparator = search.indexOf('@') === -1

    if (noSeparator) {
      const count = await db.AccountPay.count({ where: { extern_id: search } })
      if(count === 1) {
        accountPayWhere.extern_id = search
      }
    }

    if (!accountPayWhere.extern_id) {
      if (noSeparator) {
        accountWhere[Op.or] = {
          domain: search,
          address: search
        }
      } else {
        const [address, domain = ''] = search.split('@')
        if (address !== '') {
          accountWhere.address = address
        }
        if (domain !== '') {
          accountWhere.domain = domain
        }
      }
    }
  }

  const limit = 20
  const offset = limit * (page - 1)
  let results = []
  let resultAccountPay = []
  let resultBcTrx = []

  if (type !== 'bcTrx') {
    resultAccountPay = await db.AccountPay.findAndCountAll({
      raw: true,
      limit,
      offset,
      subQuery: false,
      attributes: ['pay_source', 'extern_id', 'forward_url', 'buy_price', 'metadata', 'id'],
      where: {
        [Op.and]: [
          {
            id: {
              [Op.eq]: sequelize.literal(
                `( select max(p.id) from account_pay p ` +
                `join account_pay_event e on e.account_pay_id = p.id ` +
                `where account_id = "Account"."id" )`
              )
            }
          },
          accountPayWhere,
          accountPayLitWhere
        ]
      },
      include: [
        {
          model: db.AccountPayEvent,
          attributes: [
            ['created', 'pay_created'], 'pay_status', 'pay_status_notes',
            ['created_by', 'pay_created_by'], 'extern_status', 'extern_time',
            'confirmed_total', 'pending_total', 'metadata', 'id'
          ],
          where: {
            id: {
              [Op.eq]: sequelize.literal(
                `( select max(id) from account_pay_event ` +
                `where account_pay_id = "AccountPay"."id" )`
              )
            }
          }
        },
        {
          model: db.Account,
          attributes: [['id', 'account_id'], 'address', 'domain', 'owner_key'],
          required: true,
          where: accountWhere,
          order: [['created', 'asc']],
          include: [
            {
              model: db.Wallet,
              attributes: [['name', 'wallet_name'], 'referral_code'],
              required: true
            },
            {
              model: db.BlockchainTrx,
              attributes: [
                ['type', 'blockchain_trx_type'], 'trx_id',
                'expiration', 'block_num'
              ],
              required: false,
              where: {
                type: 'register',
                id: {
                  [Op.eq]: sequelize.literal(
                    `( select max(t.id) from blockchain_trx t ` +
                    `join blockchain_trx_event e on e.blockchain_trx_id = t.id ` +
                    `where account_id = "Account"."id" )`
                  )
                }
              },
              include: [
                {
                  model: db.BlockchainTrxEvent,
                  attributes: [
                    ['created', 'trx_created'], 'trx_status',
                    'trx_status_notes', 'blockchain_trx_id'
                  ],
                  where: {
                    id: {
                      [Op.eq]: sequelize.literal(
                        `( select max(id) from blockchain_trx_event ` +
                        `where blockchain_trx_id = "Account->BlockchainTrxes"."id")`
                      )
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
    })
    console.log(resultAccountPay);
    results = resultAccountPay
  }
  if (type !== 'accountPay') {
    resultBcTrx = await db.BlockchainTrx.findAll({
      raw: true,
      limit,
      offset,
      subQuery: false,
      attributes: [
        ['type', 'blockchain_trx_type'], 'trx_id',
        'expiration', 'block_num'
      ],
      where: {
        [Op.and]: [
          {
            type: 'register',
            id: {
              [Op.eq]: sequelize.literal(
                `( select max(t.id) from blockchain_trx t ` +
                `join blockchain_trx_event e on e.blockchain_trx_id = t.id ` +
                `where account_id = "Account"."id" )`
              )
            }
          },
          bcTxWhere
        ]
      },
      include: [
        {
          model: db.BlockchainTrxEvent,
          attributes: [
            ['created', 'trx_created'], 'trx_status',
            'trx_status_notes', 'blockchain_trx_id'
          ],
          where: {
            id: {
              [Op.eq]: sequelize.literal(
                `( select max(id) from blockchain_trx_event ` +
                `where blockchain_trx_id = "BlockchainTrx"."id")`
              )
            }
          }
        },
        {
          model: db.Account,
          attributes: [['id', 'account_id'], 'address', 'domain', 'owner_key'],
          required: true,
          order: [['created', 'asc']],
          where: accountWhere,
          include: [
            {
              model: db.Wallet,
              attributes: [['name', 'wallet_name'], 'referral_code'],
              required: true
            },
            {
              model: db.AccountPay,
              attributes: [
                'pay_source', 'extern_id', 'forward_url',
                'buy_price', 'metadata', 'id'
              ],
              required: Object.keys(accountPayWhere).length !== 0,
              where: {
                id: {
                  [Op.eq]: sequelize.literal(
                    `( select max(p.id) from account_pay p ` +
                    `join account_pay_event e on e.account_pay_id = p.id ` +
                    `where account_id = "Account"."id" )`
                  )
                },
                ...accountPayWhere,
              },
              include: [
                {
                  model: db.AccountPayEvent,
                  attributes: [
                    ['created', 'pay_created'], 'pay_status', 'pay_status_notes',
                    ['created_by', 'pay_created_by'], 'extern_status', 'extern_time',
                    'confirmed_total', 'pending_total', 'metadata', 'id'
                  ],
                  where: {
                    id: {
                      [Op.eq]: sequelize.literal(
                        `( select max(id) from account_pay_event ` +
                        `where account_pay_id = "Account->AccountPays"."id" )`
                      )
                    }
                  }
                }
              ],
            },
          ]
        }
      ],
    })
    results = resultBcTrx
  }
  if (type === 'all') {
    results = [...resultAccountPay, ...resultBcTrx]
  }

  return res.send({ success: results.map(r => trimKeys(r)) })
}))

router.post('/update-trx-status', handler(async (req, res) => {
  const {username} = res.state
  if(!username) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {account_id, new_status, trx_status_notes} = req.body
  assert(typeof account_id === 'number', 'Required number: account_id')
  assert(/retry|cancel|review/.test(new_status),
    'new_status should be: retry, cancel, or review')

  await sequelize.transaction(async transaction => {
    const tr = {transaction}

    const trx = await db.BlockchainTrx.create({
      account_id, type: 'register'
    }, tr)

    const event = await db.BlockchainTrxEvent.create({
      blockchain_trx_id: trx.id,
      trx_status: new_status,
      created_by: username,
      trx_status_notes
    }, tr)
    // Updating RegistrationsSearch table record
    await saveRegistrationsSearchItem(
      {
        blockchain_trx_id: trx.id,
        blockchain_trx_event_id: event.id,
        trx_status: event.trx_status
      },
      { account_id },
      {
        blockchainTrx: trx,
        blockchainTrxEvent: event
      },
      transaction
    )

    return res.send({success: `Updated status: ${new_status}`})
  })
}))

router.post('/update-payment/:extern_id', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {extern_id} = req.params
  assert(extern_id, 'Required: extern_id')

  const payment = await plugins.payment
  await payment.updateChargeHistory(extern_id)
  return res.send({success: 'Payment updated'})
}))

/** Get all wallets */
router.get('/wallets', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const wallets = await db.Wallet.findAll()

  return res.send({list: wallets.map(w => w.get())})
}))

/** Update or create a wallet (upsert in database terms)

  @arg {boolean} req.body.webhook_enabled -- true converts to date now(), false into a null
*/
router.post('/wallet', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {referral_code, newWallet} = req.body
  assert(referral_code, 'missing body url part: referral_code')
  assert(/^[a-z0-9-]{3,20}$/.test(referral_code), 'referral_code must be lowercase and may have letters, numbers, use dashes and be 20 characters or less.')

  await sequelize.transaction(async transaction => {
    const tr = {transaction}

    let wallet = await db.Wallet.findOne({where: {referral_code}}, tr)
    let created

    if(newWallet && wallet) {
      return res.send({error: 'This referral code is already taken'})
    }
    const update = req.body

    if(update.domain_sale_price === '') {
      update.domain_sale_price = null
    }

    if(update.account_sale_price === '') {
      update.account_sale_price = null
    }

    assert(
      !update.domain_sale_active || update.domain_sale_price != null,
      'A domain sale price is required to enable a domain sale'
    )

    assert(
      !update.account_sale_active || update.account_sale_price != null,
      'An account sale price is required to enable an account sale'
    )

    if(update.webhook_enabled != null) {
      assert.equal(typeof update.webhook_enabled, 'boolean', 'webhook_enabled')
      assert(
        !update.webhook_enabled || update.webhook_shared_secret != null,
        'A Webhook Shared Secret is required before enabling the webhook'
      )
      update.webhook_enabled = update.webhook_enabled ? Sequelize.fn('now') : null
    }

    if(update.webhook_shared_secret != null) {
      update.webhook_shared_secret = checkEncrypt(
        process.env.DATABASE_ENCRYPT_SECRET,
        update.webhook_shared_secret
      )
    }

    if(wallet) {
      const [rows] = await db.Wallet.update(update, {
        where: {referral_code},
        transaction
      })

      if(rows !== 1) {
        return res.send({error: 'Failed to update wallet'})
      }

      created = false

    } else {
      try {
        wallet = await db.Wallet.create(update, tr)
        created = true
      } catch(error) {
        const nameExists = await db.Wallet.findOne({where: {name: update.name}})
        if(nameExists) {
          return res.send({error: 'This wallet name is already taken'})
        }
        throw error
      }
    }

    return res.send({success: created ? 'Created' : 'Updated'})
  })
}))

router.get('/wallet/:referral_code', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {referral_code} = req.params
  assert(referral_code, 'missing body url part: referral_code')
  assert(/^[a-z0-9-]{3,20}$/.test(referral_code), 'referral_code must be lowercase and may have letters, numbers, use dashes and be 20 characters or less.')

  const wallet = await db.Wallet.findOne({
    where: { referral_code }
  })

  if(!wallet) {
    return res.send({error: `Unknown referral code`})
  }

  const result = wallet.get()
  if(result.webhook_shared_secret !== null) {
    result.webhook_shared_secret = checkDecrypt(
      process.env.DATABASE_ENCRYPT_SECRET,
      result.webhook_shared_secret
    ).toString()
  }
  const walletApi = await db.WalletApi.findOne({
    where: { wallet_id: wallet.id }
  })
  if (walletApi) {
    result.api_token_exists = true
  }
  const accountsByDomain = await getAccountsByDomainsAndStatus(wallet.id, wallet.domains)
  result.accountsByDomain = accountsByDomain.reduce((acc, data) => {
    acc[data.domain] = parseInt(data.accounts)
    return acc
  }, {})

  return res.send(result)
}))

/** Wallet logos */
router.post('/upload', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {folder, filename, mimeType, data} = req.body

  const upload = await plugins.upload
  await upload.save({folder, filename, mimeType, data})

  return res.send({success: 'Saved'})
}))
/**
  Send or re-send unclaimed invite.
*/
router.post('/send-invite', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {email, inviteUrl} = req.body

  if(!Isemail.validate(email)) {
    return res.status(401).send({error: 'Invalid email'})
  }
  if(!inviteUrl) {
    return res.status(401).send({error: 'Missing invite URL'})
  }

  const existingEmail = await db.User.findOne({
    attributes: ['id'],
    where: {
      email,
      [Op.not]: {
        // allow re-send of unclaimed email invite
        password: null,
        force_password_change: true,
        email_password: { [Op.ne]: null }
      },
    }
  })

  if(existingEmail) {
    return res.send({error: 'Email already exists'})
  }

  const inviteBy = await db.User.findOne({
    attributes: ['username'], where: {id: user_id}
  })

  // Url safe base64, up to 47 characters
  const invite_unhashed = crypto.randomBytes(32 + 3).toString('base64').replace(/[\+\/=]/g, '')

  const invite_password_hash = checkEncrypt(
    process.env.DATABASE_ENCRYPT_SECRET,
    await bcrypt.hash(invite_unhashed, bcrypt.genSaltSync())
  )

  // update or insert
  const userUpsert = await db.User.upsert({
    email,
    email_password: invite_password_hash,
    force_password_change: true,
    invite_by: inviteBy.username
  })

  const sendmail = await plugins.email
  const email_encoded = encodeURIComponent(email)

  await sendmail.send({
    to: email,
    subject: `${process.env.TITLE} Invite`,
    html: `<p>You have been invited by <b>${inviteBy.username}</b> to join the ${process.env.TITLE}.</p>

<p>Click <a href="${inviteUrl}/${email_encoded}/${invite_unhashed}">Join</a></p>

<p><small>${inviteUrl}/${email_encoded}/${invite_unhashed}<small></p>
`,
    text: `You have been invited by ${inviteBy.username} to join the ${process.env.TITLE}.

${inviteUrl}/${email_encoded}/${invite_unhashed}
`
  })

  return res.send({success: 'Invitation sent'})
}))

const userCols = [
  'id', 'created', 'username', 'email', 'last_login',
  'force_password_change', 'mfa_enabled', 'api_enabled'
]

/** Get logged in user */
router.get('/user', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const userRow = await db.User.findOne({
    attributes: userCols,
    where: {id: user_id}
  })

  const user = userRow.get()

  const mfa = await db.UserMfa.findOne({attributes: ['id'], where: {user_id}})
  user.mfa_exists = mfa !== null

  const api = await db.UserApi.findOne({attributes: ['id'], where: {user_id}})
  user.api_exists = api !== null

  return res.send(user)
}))

/** Fetch all users */
router.get('/users', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const users = await db.User.findAll({
    attributes: userCols,
    order: ['created']
  })

  return res.send({list: users.map(user => user.get())})
}))

router.delete('/user/:id', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const deleteId = req.params.id
  assert(deleteId !== undefined, 'required id (user id)')

  const rows = await db.User.destroy({where: {id: deleteId}})

  if(rows !== 1) {
    console.log('Delete failed, rows:', rows);
    return res.status(401).send({error: 'Delete failed'})
  }

  if(deleteId == user_id) {
    for (var key in res.state) {
      delete res.state[key]
    }
  }

  return res.send({success: 'Deleted'})
}))

router.post('/user', handler(async (req, res) => {
  const {user_id} = res.state
  if(!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {email, password, username, mfa_enabled, api_enabled} = req.body
  const update = {email, mfa_enabled, api_enabled}

  if(password) {
    if(!/^[^ ]{8,60}$/.test(password)) {
      return res.status(401).send({error: 'Invalid password'})
    }

    update.password = checkEncrypt(
      process.env.DATABASE_ENCRYPT_SECRET,
      await bcrypt.hash(password, bcrypt.genSaltSync())
    )
  }

  const where = {id: user_id}

  if(username) {
    if(!/^[a-z][a-z0-9]{2,29}$/.test(username)) {
      return res.status(401).send(
        'Username should be lowercase letters and numbers and 3, 60 characters'
      )
    }
    // invite user can update the username once
    where.username = {[Op.eq]: null}
    update.username = username
  }

  if(update.mfa_enabled) {
    const mfa = await db.UserMfa.findOne({where: {user_id}})
    assert(mfa, 'Setup MFA first')
  }

  if(update.api_enabled) {
    const api = await db.UserApi.findOne({where: {user_id}})
    assert(api, 'Setup API Bearer token first')
  }

  const [rows] = await db.User.update(update, { where })

  if(rows === 1) {
    if(username) {
      res.state.username = username
    }
    return res.send({success: 'Updated'})
  }

  return res.send({error: 'Update failed'})
}))

router.get('/fill-registrations-search', handler(async (req, res) => {
  const { user_id } = res.state
  if (!user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }
  try {
    fillRegistrationsSearch()
  } catch (e) {
    console.log('fillRegistrationsSearch ERRORED === ');
    console.log(e);
  }
  return res.send({ success: 'Process is launched' })
}))

/** Generates csv report with registrations */
router.get('/csv-report', handler(async (req, res) => {
  const { user_id } = res.state
  if (!user_id) {
    return res.status(401).send({ error: 'Unauthorized' })
  }
  const filePath = await generateCsvReport(req.query.ref, req.query.domain, req.query.after)
  return res.send({ success: { filePath }});
}))

module.exports = router
