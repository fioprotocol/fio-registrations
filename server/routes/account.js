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

// @see Transaction Monitor.  TrxMonitor.vue
/**
  @api {post} /public-api/summary summary
  @apiGroup Registration
  @apiName Summary

  @apiDescription
  Check the status of a account or domain registration
  @apiParamExample {json} POST-Example:
  HTTP/1.1 200 OK
  {
    publicKey: String, // Full FIO public key (like: FIO5fnv..DZSYu)
  }

  .. or ..

  HTTP/1.1 200 OK
  {
    address: String, // before the '@'
    domain: String // after the '@'
  }

  @apiSuccessExample Success-Response
  [
    {
      address: null,
      domain: 'fio',
      owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      trx_type: 'register',
      trx_id: '1fb666a590d8d6a0334b0ad7147c8eb65a83de8932dbc75bbcf158c0ecfaaa23',
      expiration: '2020-02-22T17:27:33.500Z',
      block_num: 1531052,
      'BlockchainTrxEvents.id': 5,
      trx_status: 'success',
      trx_status_notes: 'irreversible',
      pay_source: 'free',
      forward_url: null,
      buy_price: '0.03',
      pay_metadata: null,
      extern_id: null,
      'AccountPayEvents.id': 9,
      pay_status: 'success',
      pay_status_notes: null,
      extern_time: null,
      extern_status: null
    },
    {
      address: 'memeber',
      domain: 'fio',
      owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      trx_type: 'register',
      trx_id: '4cdb133aa17a2bde2fd4b4fca05b6d6737397ab8a3906b51f7f6dd3376bf4316',
      expiration: '2020-02-22T15:15:52.500Z',
      block_num: null,
      'BlockchainTrxEvents.id': 2,
      trx_status: 'review',
      trx_status_notes: 'FIO Domain is not public. Only owner can create FIO Addresses.',
      pay_source: 'free',
      forward_url: null,
      buy_price: '0.03',
      pay_metadata: null,
      extern_id: null,
      'AccountPayEvents.id': 8,
      pay_status: 'success',
      pay_status_notes: null,
      extern_time: null,
      extern_status: null
    },
    ...
  ]
*/
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
