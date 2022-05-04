/**
  All authenticated routes primarily for the API excluding Admin
  interface routes.

  @see also ./admin.js
*/
const debug = require('debug')('fio:admin-api')
const assert = require('assert')

const router = require('express').Router();
const handler = require('./handler')

const {PublicKey} = require('@fioprotocol/fiojs').Ecc

const db = require('../db/models')
const {Sequelize, sequelize} = db
const {Op} = Sequelize

const { saveRegistrationsSearchItem } = require('../registrations-search-util')
const { ACCOUNT_TYPES } = require('../constants')

/**
  Create or update a payment in the system.  A pay_status of `success` will trigger a domain registration.
*/
router.post('/buy', handler(async (req, res) => {
  const {username} = res.state

  const {
    referral_code = null,
    domain = null,
    owner_key = null,
    pay_source = 'api',
    extern_id = null,
    forward_url = null,
    buy_price = null,
    pay_status = null,
    pay_status_notes = null,
    extern_status = null,
    extern_time = null,
    confirmed_total = null,
    pending_total = null,
    metadata = null,
    type = ACCOUNT_TYPES.register,
  } = req.body

  let { address } = req.body

  assert(referral_code, 'required: referral_code')
  assert(buy_price, 'required: buy_price')
  assert(domain, 'required: domain')
  assert(owner_key, 'required: owner_key')
  assert(pay_source, 'required: pay_source')

  if (address && address.trim() === '') {
    address = null
  }

  // assert(pay_status === 'success', 'expecting pay_status to be: "success"')

  assert(/pending|success|review|cancel/.test(pay_status),
    'pay_status should be: pending, success, review, or cancel')

  assert(PublicKey.isValid(owner_key), 'invalid owner key')

  let account = await db.Account.findOne({
    where: {address, domain},
    include: {
      model: db.Wallet,
      attributes: ['id', 'referral_code']
    }
  })

  let wallet_id = null

  if(account) {
    if(owner_key) {
      assert(account.owner_key === owner_key,
        `Unmatched owner key, if provided expecting '${account.owner_key}'`
      )
    }
    wallet_id = account.Wallet.id
  }

  if(account && referral_code) {
    const rc = account.Wallet.referral_code
    assert(rc === referral_code,
      `Unmatched referral_code, if provided expecting '${rc}'`)
  }

  if(referral_code && !account) {
    const wallet = await db.Wallet.findOne({
      attributes: ['id'],
      where: {referral_code}
    })

    if(wallet) {
      wallet_id = wallet.id
    }
  }

  assert(wallet_id !== null, 'Invalid referral code')

  await sequelize.transaction(async transaction => {
    const tr = {transaction}

    if(!account) {
      account = await db.Account.create({
        wallet_id,
        domain,
        address,
        owner_key,
        type
      }, tr)
      await saveRegistrationsSearchItem(
        {
          domain,
          address,
          owner_key,
          account_id: account.id,
          created: account.created,
          account_type: type
        },
        {},
        account,
        transaction,
        true
      )
    }

    let accountPay = await db.AccountPay.findOne({
      attributes: ['id', 'extern_id', 'forward_url', 'buy_price'],
      where: {
        pay_source, extern_id,
        account_id: account.id
      }
    })

    if(accountPay) {
      assert(!extern_id || accountPay.extern_id === extern_id,
        `Unmatched extern_id, if provided expecting '${accountPay.extern_id}'`
      )
      assert(!forward_url || accountPay.forward_url === forward_url,
        `Unmatched forward_url, if provided expecting '${accountPay.forward_url}'`
      )
      assert(!buy_price || accountPay.buy_price === buy_price,
        `Unmatched buy_price, if provided expecting '${accountPay.buy_price}'`
      )
    }

    if(!accountPay) {
      accountPay = await db.AccountPay.create({
        account_id: account.id,
        pay_source,
        extern_id,
        forward_url,
        buy_price,
        metadata: {
          created_by: username,
          source: 'api'
        }
      }, tr)
      await saveRegistrationsSearchItem(
        {
          extern_id,
          account_pay_id: accountPay.id
        },
        { account_id: account.id },
        accountPay,
        transaction
      )
    }

    let accountPayEvent = await db.AccountPayEvent.findOne({
      attributes: [ 'event_id', 'pay_status' ],
      where: {account_pay_id: accountPay.id},
      order: [['id', 'desc']],
      limit: 1
    })

    let event_id = 0

    if(accountPayEvent) {
      // lots of case logic here if more status updates are enabled in the future
      if(accountPayEvent.pay_status === 'success') {
        assert(false, `Can not change once pay_status is 'success'`)
      }

      assert(pay_status !== 'pending', `Can not change existing pay_status to 'pending'`)

      if(accountPayEvent.event_id && !isNaN(accountPayEvent.event_id)) {
        event_id = String(Number(accountPayEvent.event_id) + 1)
      }
    }

    // create is for both: new and updates
    accountPayEvent = await db.AccountPayEvent.create({
      event_id, created_by: username,
      account_pay_id: accountPay.id,
      pay_status,
      pay_status_notes,
      extern_status,
      extern_time,
      confirmed_total,
      pending_total,
      metadata
    }, tr)
    // Updating RegistrationsSearch table record
    await saveRegistrationsSearchItem(
      {
        pay_status,
        account_pay_event_id: accountPayEvent.id
      },
      { account_id: account.id, account_pay_id: accountPay.id },
      accountPayEvent,
      transaction
    )

    return res.send({success: {
      referral_code,
      account_id: account.id,
      event_id
    }})
  })
}))


module.exports = router
