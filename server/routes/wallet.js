const assert = require('assert')
const express = require('express');
const router = express.Router();
const handler = require('./handler')

const {fio} = require('../api')
const plugins = require('../plugins')
const {trimKeys} = require('../db/helper')

const transactions = require('../db/transactions')
const db = require('../db/models')
const {Sequelize, sequelize} = db
const {Op} = Sequelize

const {PublicKey} = require('@fioprotocol/fiojs').Ecc

if(process.env.MIN_ADDRESS_PRICE == null) {
  throw new Error('Required: process.env.MIN_ADDRESS_PRICE')
}

router.get('/public-api/check-public-key/:publicKey', handler(async (req, res) => {
  const isPublicKey = PublicKey.isValid(req.params.publicKey)
  return res.send({success: isPublicKey})
}))

router.post('/public-api/ref-wallet', handler(async (req, res) => {
  let {referralCode} = req.body

  if(!referralCode) {
    referralCode = process.env.DEFAULT_REFERRAL_CODE
  }

  const wallet = await db.Wallet.findOne({
    attributes: [
      'id', 'name', 'logo_url', 'domains',
      'domain_sale_price',
      'account_sale_price',
      'domain_sale_active',
      'account_sale_active'
    ],
    where: {
      referral_code: referralCode,
      active: true
    }
  })

  const {
    id, name, logo_url, domains,
    domain_sale_price,
    account_sale_price,
    domain_sale_active,
    account_sale_active
  } = wallet || {}

  return res.send({success: wallet});
}))

router.post('/public-api/buy-address', handler(async (req, res) => {
  const {
    address, referralCode, publicKey,
    redirectUrl
  } = req.body

  const processor = await plugins.payment

  const ref = referralCode ? referralCode : process.env.DEFAULT_REFERRAL_CODE
  const wallet = await db.Wallet.findOne({
    attributes: [
      'id',
      'name',
      'logo_url',
      'domain_sale_price',
      'account_sale_price',
      'domain_sale_active',
      'account_sale_active'
    ],
    where: {
      referral_code: ref,
      active: true
    }
  })

  if(!wallet) {
    return res.status(400).send({error: 'Referral code not found'})
  }

  const addressArray = address.split('@')
  const buyAccount = addressArray.length === 2
  const type = buyAccount ? 'account' : 'domain'
  if(!wallet[`${type}_sale_active`]) {
    return res.status(400).send(
      {error: `This referral code is not selling ${type}s.`}
    )
  }

  const {name, logo_url} = wallet
  const price = +Number(wallet[`${type}_sale_price`])

  // Block free accounts if this server is not forked and implemented for this
  if(type === 'account' && price < process.env.MIN_ADDRESS_PRICE) {
    return res.status(400).send({error: `Price is too low`})
  }

  // apply credit
  const balance = await transactions.balance(publicKey)

  let credit = 0
  if(balance.total) {
    const bal = +Number(balance.total)
    if(bal < 0) {
      credit = bal
    }
  }
  const adjPrice = Math.max(0, +Number(price + credit).toFixed(2))

  const result = await db.sequelize.transaction(async transaction => {
    const tr = {transaction}

    const accountObj = {
      domain: addressArray.length === 1 ? addressArray[0] : addressArray[1],
      address: addressArray.length === 1 ? null : addressArray[0],
      wallet_id: wallet.id
    }

    const [account] = await db.Account.findOrCreate({
      defaults: accountObj,
      where: {
        domain: accountObj.domain,
        address: accountObj.address || null,
        owner_key: publicKey
      },
      transaction
    })

    if(
      (type === 'account' && price === 0) ||
      adjPrice === 0
    ) {
      const accountPay = await db.AccountPay.create({
        pay_source: 'free',
        buy_price: price,
        account_id: account.id,
      }, tr)

      const accountPayEvent = await db.AccountPayEvent.create({
        pay_status: 'success',
        event_id: String(0),
        account_pay_id: accountPay.id
      }, tr)

      return {success: true, account_id: account.id}
    }

    const charge = await processor.createCharge({
      name, logoUrl: logo_url, price: adjPrice, type, address, publicKey,
      accountId: account.id, redirectUrl
    })

    const {
      event_id = 0,
      extern_id,
      extern_status,
      extern_time,
      forward_url
    } = charge

    const metadata = charge.metadata && Object.keys(charge.metadata).length ?
      charge.metadata : null

    const accountPay = await db.AccountPay.create({
      pay_source: process.env.PLUGIN_PAYMENT,
      extern_id,
      buy_price: price,
      metadata,
      account_id: account.id,
      forward_url
    }, tr)

    let pay_status
    if(charge.pending === false) {
      pay_status = 'cancel'
    } else if(charge.pending === true) {
      pay_status = 'pending'
    } else { // event.pending === undefined
      pay_status = 'review'
    }

    const accountPayEvent = await db.AccountPayEvent.create({
      pay_status,
      event_id: String(event_id),
      extern_time,
      extern_status,
      account_pay_id: accountPay.id
    }, tr)

    return {success: {charge}, account_id: account.id}
  })

  return res.send(result);
}))

/** For In-app Checkout.vue */
// router.post('/public-api/cancel-charge/:extern_id', handler(async (req, res) => {
//   const {extern_id} = req.params
//   assert(typeof extern_id === 'string', 'Required parameter: extern_id')
//
//   const processor = await plugins.payment
//   const {success, error} = await processor.cancelCharge(extern_id)
//   return res.send({success, error})
// }))

/** For Checkout.vue */
router.get('/public-api/charge/:extern_id', handler(async (req, res) => {
  const {extern_id} = req.params
  assert(typeof extern_id === 'string', 'Required parameter: extern_id')

  const pay_source = plugins.payment_name
  const processor = await plugins.payment
  const charge = await processor.getCharge(extern_id)

  if(charge.error) {
    return res.send({error: charge.error})
  }

  let wallet = await db.Wallet.findOne({
    raw: true,
    attributes: ['id', 'logo_url', 'name', 'referral_code'],
    include: {
      model: db.Account, attributes: ['id', 'domain', 'address', 'owner_key'],
      include: {
        model: db.AccountPay, attributes: ['id'],
        where: {pay_source, extern_id}
      }
    }
  })

  if(!wallet) {
    return res.send({error: 'Not found'})
  }

  wallet = trimKeys(wallet)

  if(!wallet.logo_url) {
    wallet.logo_url = '/images/logo.svg'
  }

  return res.send({success: true, charge, wallet })
}))

module.exports = router;
