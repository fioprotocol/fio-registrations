const assert = require('assert')
const express = require('express');
const router = express.Router();
const handler = require('./handler')

const {fio} = require('../api')
const plugins = require('../plugins')

const db = require('../db/models')
const {Sequelize, sequelize} = db
const {Op} = Sequelize

const {PublicKey} = require('@fioprotocol/fiojs').Ecc

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

// test query
// ;(async () => {
//
//   console.log(JSON.stringify(result, null, 2));
// })().catch(e => console.error(e))


// router.post('/public-api/ref-domains', handler(async (req, res) => {
//   const {referralCode} = req.body
//   const ref = referralCode ? referralCode : process.env.DEFAULT_REFERRAL_CODE
//
//    const wallet = await db.Wallet.findOne({
//     attributes: ['domains', 'account_sale_active'],
//     where: { referral_code: ref },
//   })
//
//   if(!wallet) {
//     return res.status(400).send({error: `Referral code not found`})
//   }
//
//   if(!wallet.account_sale_active) {
//     return res.send({success: []})
//   }
//
//   const {domains} = wallet
//   return res.send({success: domains});
// }))

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
    return res.status(400).send({error: `This referral code is not selling ${type}s.`})
  }

  const {name, logo_url} = wallet
  const price = wallet[`${type}_sale_price`]

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

    const charge = await processor.createCharge({
      name, logoUrl: logo_url, price, type, address, publicKey,
      accountId: account.id, redirectUrl
    })

    const {
      pay_status,
      event_id,
      extern_id,
      extern_status,
      extern_time,
      forward_url
    } = charge

    const metadata = charge.metadata && Object.keys(charge.metadata).length ? metadata : null

    const accountPay = await db.AccountPay.create({
      pay_source: process.env.PLUGIN_PAYMENT,
      extern_id,
      buy_price: price,
      metadata,
      account_id: account.id,
      forward_url
    }, tr)

    const accountPayEvent = await db.AccountPayEvent.create({
      pay_status,
      event_id: String(event_id),
      extern_time,
      extern_status,
      account_pay_id: accountPay.id
    }, tr)

    return {charge, account_id: account.id}
  })

  const {charge, account_uuid} = result
  return res.send({
    success: {
      account_uuid,
      charge
    }
  });
}))

module.exports = router;
