const fetch = require('isomorphic-fetch')
const AbortController = require('abort-controller')

const crypto = require('crypto')
const {createHmac} = crypto
const {checkDecrypt} = require('./encryption-check')

const db = require('./db/models');
const {Sequelize, sequelize} = db
const {Op} = Sequelize

let debug = require('debug')('fio:process-webhook')
const trace = require('./trace-filter')(() => debug, extend => debug = extend)

async function all() {
  return trace({postWebhookEvents})()
}

/**
*/
async function postWebhookEvents() {
  function post(eventsByEndpoint, alias) {
    // these can run in parallel
    const eps = Object.keys(eventsByEndpoint).map(function (endpoint) {
      return eventsByEndpoint[endpoint].map(function (event) {
        // synchronous event delivery
        return postWebhookEvent(endpoint, event, alias)
      })
    })

    return Promise.all(eps)
  }

  const p = []

  const events = await webhookQuery(
    db.AccountPayEvent, apiCols.account_pay_event,
    db.AccountPay, apiCols.account_pay,
    'AccountPay'
  )

  const eventsByEndpoint = groupBy(events, el =>
    el.AccountPay.Account.Wallet.webhook_endpoint)

  p.push( post(eventsByEndpoint, 'AccountPay') )

  const trxEvents = await webhookQuery(
    db.BlockchainTrxEvent, apiCols.blockchain_trx_event,
    db.BlockchainTrx, apiCols.blockchain_trx,
    'BlockchainTrx'
  )
  const trxEventsByEndpoint = groupBy(trxEvents, el =>
    el.BlockchainTrx.Account.Wallet.webhook_endpoint)

  p.push( post(trxEventsByEndpoint, 'BlockchainTrx') )

  return Promise.all(p)
}

/** One tupple: [endpoint, decrypted webhook shared secret] */
const webhookSecretCache = ['', '']

async function postWebhookEvent(endpoint, event, alias) {
  const {webhook_shared_secret} = event[alias].Account.Wallet
  const {webhook_events} = event[alias].Account.Wallet

  let webhookSecret;
  if(webhookSecretCache[0] === event.wallet_referral_code) {
    webhookSecret = webhookSecretCache[1]
  } else {
    webhookSecret = checkDecrypt(
      process.env.DATABASE_ENCRYPT_SECRET,
      webhook_shared_secret
    ).toString()
    webhookSecretCache[0] = event.wallet_referral_code
    webhookSecretCache[1] = webhookSecret
  }

  const type = alias === 'AccountPay' ? 'payment' : 'registration'
  const status = alias === 'AccountPay' ? event.pay_status : event.trx_status
  const data = alias === 'AccountPay' ?
    formatPayEvent(event) :
    formatTrxEvent(event)

  const attempt = event.WebhookEvent ? event.WebhookEvent.attempt + 1 : 1
  const POST = {type, status, attempt, data}
  const body = JSON.stringify(POST)

  const signature = createHmac('sha256', webhookSecret)
      .update(body).digest().toString('hex')

  const headers = {
    ['Content-Type']: 'application/json',
    ['X-CC-Webhook-Signature']: signature
  }

  const webhookEvent = {}
  webhookEvent.attempt = attempt

  const controller = new AbortController();
  const request = { method: 'POST', body, headers, signal: controller.signal }
  let response, timeout

  try {
    // fetch can hang for over a minute, wrapping it in a Promise allows an early timeout
    response = await new Promise(async function(resolve, reject) {
      let didTimeout
      timeout = setTimeout(function() {
        controller.abort()
        didTimeout = true
        reject(new Error('timeout'));
      }, process.env.WEBHOOK_TIMOUT || 3000);

      const res = await fetch(endpoint, request)
      clearTimeout(timeout)

      if(didTimeout) {
        reject(res)
      } else {
        resolve(res)
      }
    })
  } catch (err) {
    webhookEvent.message = err.message
  } finally {
    clearTimeout(timeout)

    webhookEvent.response_status = response ? response.status : null
    if(!webhookEvent.message) {
      webhookEvent.message = response ? (await response.text()) : null
    }
    webhookEvent.next_attempt = response && response.ok ? null : new Date(
      // Date.now() instead of last next_attempt is used incase this server has down-time
      Date.now() + (fibonacci(webhookEvent.attempt) * 60 * 1000)
    )

    if(debug.enabled) {
      debug('POST', JSON.stringify({endpoint, event: webhookEvent, POST}))
    }

    if(webhookEvent.message) {
      webhookEvent.message = webhookEvent.message.substring(0, 200)
    }

    if(event.WebhookEvent) {
      await db.WebhookEvent.update(
        webhookEvent,
        {where: {id: event.WebhookEvent.id}}
      )
    } else {
      await sequelize.transaction(async transaction => {
        const tr = {transaction}

        const wh = await db.WebhookEvent.create( webhookEvent, tr );
        event.setWebhookEvent(wh)
        await event.save(tr)
      })
    }
  }

  return webhookEvent
}

/**
  Retry wait-times
*/
function fibonacci(num) {
  if (num <= 1) return 1;
  return fibonacci(num - 1) + fibonacci(num - 2);
}
// s = 0; for(i = 1; i <= 18; i++) {console.log(i, fibonacci(i), s += fibonacci(i))}; s/60/24

function groupBy(arr, keyFn) {
  const ret = {}
  arr.forEach(el => {
    const key = keyFn(el)
    let value = ret[key]
    if(value === undefined) {
      value = ret[key] = []
    }
    value.push(el)
  })
  return ret
}

// columns with immutable data, they change by adding new rows
const apiCols = {
  wallet: ['referral_code'],
  account: [ 'domain', 'address', 'created', 'owner_key' ],
  account_pay: [ 'pay_source', 'buy_price', ['metadata', 'pay_metadata'], 'extern_id' ],
  account_pay_event: [
    'extern_status', 'extern_time', 'confirmed_total', 'pending_total',
    'pay_status', 'pay_status_notes',
    'created', 'event_id', 'metadata', 'created_by'
  ],
  blockchain_trx: [
    'type', 'trx_id', 'expiration', 'block_num', 'block_time'
  ],
  blockchain_trx_event: [
    'created', 'trx_status', 'trx_status_notes', 'created_by'
  ]
}

function webhookQuery (model, cols, eventModel, eventCols, alias) {
  return model.findAll({ // AccountPayEvent or BlockchainTrxEvent
    attributes: [ 'id', ...cols ],
    include: [
      {
        model: db.WebhookEvent,
        required: false,
      },
      {model: eventModel, required: true, // AccountPay or BlockchainTrx
        attributes: [ 'id', ...eventCols ],
        include: {model: db.Account, required: true,
          attributes: [ ...apiCols.account ],
          include: {
            model: db.Wallet, required: true, attributes: [
              'id', 'webhook_endpoint', 'webhook_shared_secret',
              ...apiCols.wallet,
            ]
          }
        }
      }
    ],
    where: [
      {created: {
          [Op.gte]: Sequelize.col(`"${alias}->Account->Wallet".webhook_enabled`),
      }},
      {created: {
        [Op.gte]: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days
      }},
      sequelize.literal(
      `(response_status IS NULL OR (response_status < 200 OR response_status >= 300)) ` +
      `AND (next_attempt IS NULL OR now() >= next_attempt) ` +
      `AND (attempt IS NULL OR attempt <= 18) ` + // 18 takes about 7 days
      (alias === 'AccountPay' ?
        `AND pay_status = ANY(webhook_pay_events) `:
        `AND trx_status = ANY(webhook_trx_events) `)
      )
    ],
    order: sequelize.literal(`webhook_endpoint, created`)
  })
}

function formatPayEvent(payEvent) {
  const event = {}
  setCols(event, 'wallet_', payEvent.AccountPay.Account.Wallet, apiCols.wallet)
  setCols(event, 'account_', payEvent.AccountPay.Account, apiCols.account)
  setCols(event, 'pay_', payEvent.AccountPay, apiCols.account_pay)
  setCols(event, 'pay_', payEvent, apiCols.account_pay_event)
  return event
}

function formatTrxEvent(payEvent) {
  const event = {}
  setCols(event, 'wallet_', payEvent.BlockchainTrx.Account.Wallet, apiCols.wallet)
  setCols(event, 'account_', payEvent.BlockchainTrx.Account, apiCols.account)
  setCols(event, 'trx_', payEvent.BlockchainTrx, apiCols.blockchain_trx)
  setCols(event, 'trx_', payEvent, apiCols.blockchain_trx_event)
  return event
}

function setCols(event, prefix, obj, cols) {
  cols.forEach(col => {
    if(Array.isArray(col)) {
      col = col[1] // alias
    }
    if(col.startsWith(prefix)) {
      event[col] = obj[col]
      return
    }
    if(event[prefix + col]) {
      throw new Error('duplicate: ' + col)
    }
    event[prefix + col] = obj[col]
  })
}

module.exports = {
  all: trace({all})
}
