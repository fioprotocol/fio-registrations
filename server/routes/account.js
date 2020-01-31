const assert = require('assert')
const router = require('express').Router();
const handler = require('./handler')
const {trimKeys} = require('../db/helper')

// const {fio} = require('../api')
const {PublicKey} = require('@fioprotocol/fiojs').Ecc

const db = require('../db/models')
const transactions = require('../db/transactions')
const {Sequelize, sequelize} = db
const {Op} = Sequelize

const limit = require("express-rate-limit")

const hourlyLimit = (max, key = '') => limit({
  keyGenerator: req => req.ip + key,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV !== 'production' ? Math.max(60, max) : max,
  handler: function (req, res) {
    res.send({error: 'Too many requests in one hour'})
  }
})

/** Credit Balance for purchases.  Home.vue */
router.get('/public-api/balance/:publicKey', hourlyLimit(20), handler(async (req, res) => {
  const {publicKey} = req.params
  assert(PublicKey.isValid(publicKey), 'Invalid public key')
  const balance = await transactions.balance(publicKey)
  return res.send({success: true, balance})
}))

/** Transaction Monitor.  TrxMonitor.vue */
router.post('/public-api/summary', handler(async (req, res) => {
  const {publicKey} = req.body
  let {referralCode, trxStatus} = req.body
  const {address, domain} = req.body

  assert(publicKey || domain, 'Public key or domain is required')

  if(!referralCode) {
    referralCode = process.env.DEFAULT_REFERRAL_CODE
  }

  let accountWhere = {}
  let walletWhere = {}

  if(domain) {
    const {user_id} = res.state
    accountWhere = { address, domain }
  } else {
    if(!PublicKey.isValid(publicKey)) {
      return res.status(400).send({error: 'Invalid public key'})
    }

    accountWhere.owner_key = publicKey
    walletWhere.referral_code = referralCode
  }

  const result = await db.Account.findAll({
    raw: true,
    attributes: ['address', 'domain', 'owner_key'],
    where: accountWhere,
    order: [['id', 'desc']],
    include: [
      {
        attributes: [],
        model: db.Wallet,
        where: walletWhere
      },
      {
        attributes: [
          ['type', 'trx_type'], 'trx_id', 'expiration', 'block_num'
        ],
        model: db.BlockchainTrx,
        required: false,
        where: {
          id: {
            // newest payment (only 1)
            [Op.eq]: sequelize.literal(
              `( select max(t.id) from blockchain_trx t ` +
              `join blockchain_trx_event e on e.blockchain_trx_id = t.id ` +
              `where account_id = "Account"."id" )`
            )
          }
        },
        include: [
          {
            attributes: ['trx_status', 'trx_status_notes'],
            model: db.BlockchainTrxEvent,
            where: {
              // trx_status: trxStatus,
              id: {
                // newest event
                [Op.eq]: sequelize.literal(
                  `( select max(id) from blockchain_trx_event ` +
                  `where blockchain_trx_id = "BlockchainTrxes"."id" )`
                )
              }
            }
          }
        ]
      },
      {
        attributes: [
          'pay_source', 'forward_url', 'buy_price',
          ['metadata', 'pay_metadata'], 'extern_id'
        ],
        model: db.AccountPay,
        where: {
          id: {
            // newest payment
            [Op.eq]: sequelize.literal(
              `( select max(p.id) from account_pay p ` +
              `join account_pay_event e on e.account_pay_id = p.id ` +
              `where account_id = "Account"."id" )`
            )
          }
        },
        include: [
          {
            attributes: [
              'pay_status', 'pay_status_notes', ['metadata', 'pay_metadata'],
              'extern_time', 'extern_status'
            ],
            model: db.AccountPayEvent,
            where: {
              // pay_status: regStatus,
              id: {
                // newest event
                [Op.eq]: sequelize.literal(
                  `( select max(id) from account_pay_event ` +
                  `where account_pay_id = "AccountPays"."id" )`
                )
              }
            }
          }
        ]
      },
    ]
  })

  return res.send(result.map(r => trimKeys(r)))
}))

module.exports = router
