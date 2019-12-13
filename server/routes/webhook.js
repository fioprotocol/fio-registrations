const router = require('express').Router();
const handler = require('./handler')
const assert = require('assert')
const fetch = require('isomorphic-fetch')
const crypto = require('crypto')
const {createHmac} = crypto

const db = require('../db/models')
const sequelize = require('sequelize')
const {Op} = sequelize

const exampleEvents = {
  ['payment:pending [new]']: {
    type: 'payment',
    status: 'pending',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'okpay',
      account_created: '2020-01-20T16:47:02.911Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      pay_source: 'coinbase',
      pay_buy_price: '0.03',
      pay_metadata: null,
      pay_extern_id: 'QBJCJZRK',
      pay_extern_status: 'NEW',
      pay_extern_time: '2020-01-20T16:47:03.000Z',
      pay_confirmed_total: null,
      pay_pending_total: null,
      pay_status: 'pending',
      pay_status_notes: null,
      pay_created: '2020-01-20T16:47:02.911Z',
      pay_event_id: '0',
      pay_created_by: null
    }
  },
  ['payment:pending [with amount]']: {
    type: 'payment',
    status: 'pending',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'okpay',
      account_created: '2020-01-20T16:47:02.911Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      pay_source: 'coinbase',
      pay_buy_price: '0.03',
      pay_metadata: '{"payment":{"network":"bitcoincash","transaction_id":"7805...ef96"}}',
      pay_extern_id: 'QBJCJZRK',
      pay_extern_status: 'PENDING',
      pay_extern_time: '2020-01-20T16:51:26.000Z',
      pay_confirmed_total: null,
      pay_pending_total: '0.03',
      pay_status: 'pending',
      pay_status_notes: null,
      pay_created: '2020-01-20T16:51:26.757Z',
      pay_event_id: '1',
      pay_created_by: null
    }
  },
  ['payment:success']: {
    type: 'payment',
    status: 'success',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'okpay',
      account_created: '2020-01-20T16:47:02.911Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      pay_source: 'coinbase',
      pay_buy_price: '0.03',
      pay_metadata: '{"payment":{"network":"bitcoincash","transaction_id":"7805...ef96"}}',
      pay_extern_id: 'QBJCJZRK',
      pay_extern_status: 'COMPLETED',
      pay_extern_time: '2020-01-20T17:05:11.000Z',
      pay_confirmed_total: '0.03',
      pay_pending_total: null,
      pay_status: 'success',
      pay_status_notes: null,
      pay_created: '2020-01-20T17:05:11.724Z',
      pay_event_id: '2',
      pay_created_by: null
    }
  },
  ['payment:review [underpaid]']: {
    type: 'payment',
    status: 'review',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'veryunderpay',
      account_created: '2020-01-20T19:19:03.839Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      pay_source: 'coinbase',
      pay_buy_price: '0.03',
      pay_metadata: '{"payment":{"network":"bitcoincash","transaction_id":"a74e1c8e0ae300ef67ec5c36fb6c841d25194b065da2f95cbdceafd3d057d0b6"}}',
      pay_extern_id: 'GGVJ5ZL3',
      pay_extern_status: 'UNDERPAID',
      pay_extern_time: '2020-01-20T20:05:01.000Z',
      pay_confirmed_total: '0.02',
      pay_pending_total: null,
      pay_status: 'review',
      pay_status_notes: null,
      pay_created: '2020-01-20T20:05:01.978Z',
      pay_event_id: '2',
      pay_created_by: null
    }
  },
  ['payment:cancel']: {
    type: 'payment',
    status: 'cancel',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'cancel',
      account_created: '2020-01-21T19:21:35.376Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      pay_source: 'coinbase',
      pay_buy_price: '0.03',
      pay_metadata: null,
      pay_extern_id: 'H9B99D27',
      pay_extern_status: 'EXPIRED',
      pay_extern_time: '2020-01-21T20:21:41.000Z',
      pay_confirmed_total: null,
      pay_pending_total: null,
      pay_status: 'cancel',
      pay_status_notes: null,
      pay_created: '2020-01-21T20:21:41.210Z',
      pay_event_id: '1',
      pay_created_by: null
    }
  },
  ['registration:pending']: {
    type: 'registration',
    status: 'pending',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'okpay',
      account_created: '2020-01-20T15:36:18.295Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      trx_type: 'register',
      trx_id: '107eb280edd6affbf15b3629fddb917c719d7628d068a9a69d8e38ff7de0cbdc',
      trx_expiration: '2020-01-20T15:37:23.000Z',
      trx_block_num: 1198224,
      trx_block_time: '2020-01-20T15:36:25.000Z',
      trx_created: '2020-01-20T15:36:24.888Z',
      trx_status: 'pending',
      trx_status_notes: null,
      trx_created_by: null
    }
  },
  // ['registration:retry']: {
  // },
  ['registration:success']: {
    type: 'registration',
    status: 'success',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'okpay',
      account_created: '2020-01-20T15:36:18.295Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      trx_type: 'register',
      trx_id: '107eb280edd6affbf15b3629fddb917c719d7628d068a9a69d8e38ff7de0cbdc',
      trx_expiration: '2020-01-20T15:37:23.000Z',
      trx_block_num: 1198224,
      trx_block_time: '2020-01-20T15:36:25.000Z',
      trx_created: '2020-01-20T15:39:13.766Z',
      trx_status: 'success',
      trx_status_notes: 'irreversible',
      trx_created_by: null
    }
  },
  ['registration:expire']: {
    type: 'registration',
    status: 'expire',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'expire',
      account_address: null,
      account_created: '2020-01-21T19:23:14.397Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      trx_type: 'register',
      trx_id: 'e14041574100a082fc31b91a3e253ea698328a6b9ca7a0a25ab204c3d66ff7eb',
      trx_expiration: '2020-01-21T19:36:06.000Z',
      trx_block_num: 1399670,
      trx_block_time: '2020-01-21T19:35:08.000Z',
      trx_created: '2020-01-21T19:38:57.248Z',
      trx_status: 'expire',
      trx_status_notes: null,
      trx_created_by: null
    }
  },
  // ['registration:review']: {
  // },
  ['registration:cancel']: {
    type: 'registration',
    status: 'cancel',
    attempt: 1,
    data: {
      wallet_referral_code: 'fio',
      account_domain: 'fio',
      account_address: 'veryunderpay',
      account_created: '2020-01-20T19:19:03.839Z',
      account_owner_key: 'FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu',
      trx_type: 'register',
      trx_id: null,
      trx_expiration: null,
      trx_block_num: null,
      trx_block_time: null,
      trx_created: '2020-01-20T20:09:26.474Z',
      trx_status: 'cancel',
      trx_status_notes: null,
      trx_created_by: 'fio'
    }
  },
}

const events = Object.keys(exampleEvents)

router.get('/webhook-tests', handler(async (req, res) => {
  return res.send(events)
}))

router.get('/webhook-generate-shared-secret', handler(async (req, res) => {
  return res.send({success:
    crypto.randomBytes(35).toString("base64").replace(/[\+\/=]/g, "")
  })
}))

router.post('/webhook-test', handler(async (req, res) => {
  const {event, endpoint, webhook_shared_secret} = req.body

  assert(event, `Expecting json body param: "event" (one of: ${events.join(', ')})`)
  assert(endpoint, 'Expecting json body param: endpoint')
  const exampleEvent = exampleEvents[event]
  assert(exampleEvent, 'Unknown event: ' + event)
  assert(webhook_shared_secret, 'Expected json body param : webhook_shared_secret')

  const body = JSON.stringify(exampleEvent)

  const signature = createHmac('sha256', webhook_shared_secret)
      .update(body).digest().toString('hex')

  const headers = {
    ['Content-Type']: 'application/json',
    ['X-CC-Webhook-Signature']: signature
  }

  const request = {
    method: 'POST',
    body,
    headers
  }

  const response = await fetch(endpoint, request)
  const {status, statusText, ok} = response

  return res.send({
    success: true,
    headers,
    response: {
      status, statusText, ok,
      ['Content-Type']: response.headers.get("content-type"),
      body: await response.text()
    }
  })
}))

module.exports = router;
