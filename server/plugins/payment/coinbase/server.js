const JsonFetch = require('../../../../src/api/json-fetch')
const createHmac = require('create-hmac')

if(!process.env.COINBASE_API_KEY) {
  throw new Error('Required: process.env.COINBASE_API_KEY');
}

if(!process.env.COINBASE_WEBHOOK_SECRET) {
  throw new Error('Required: process.env.COINBASE_WEBHOOK_SECRET');
}

const {pollingStatusMap} = require('./common')

class Coinbase {
  constructor({syncEvents, debug}) {
    this.syncEvents = syncEvents
    this.debug = debug

    const req = request => {
      request.headers['X-CC-Api-Key'] = process.env.COINBASE_API_KEY
      request.headers['X-CC-Version'] = '2018-03-22'
    }

    this.coinbase = new JsonFetch('https://api.commerce.coinbase.com', {req})
  }

  /** @plugin optional async initialization */
  async init() {
    return new Promise(resolve => resolve())
  }

  /** @plugin required by Interface */
  getDisplayName() {
    return 'Coinbase'
  }

  /**
    Open a payment transaction at the payment provider.

    @plugin required

    <code>
    return {
      event_id: String = 0, // Tracks status updates, date+time is not unique
      extern_id: String, // Is a unique ID (seq 0..n) for timeline event (used to filter prior status lines and pick up new ones)
      extern_status: String, // is any status the processor returns
      extern_time: Date, // is a time stamp returned by the processor
      forward_url: String // (optional) if provided, server be configured to ignore
      addresses: Object = { // 3rd party payment interface
        bitcoincash: "qzf7u3s83j8mz4t208rvygstmtkls89kvylmgfapj3",
        litecoin: "MQ4DpbTCZuANnGe4QB5b2LVNsM8Ww7PwWK",
        bitcoin: "3J2MGSGSmweD6mMMCJGEwtsMXHNFJ42ueV",
        ethereum: "0x72f11a3274e3b92c0daf9f5f770d99e2a0d50775",
        usdc: "0x72f11a3274e3b92c0daf9f5f770d99e2a0d50775"
      },
      pricing: Object = { // 3rd party payment interface
        local: {
          amount: "0.030000",
          currency: "USDC"
        },
        bitcoincash: {
          amount: "0.00008158",
          currency: "BCH"
        }
        // etc
      }
    }
    </code>
    @return {pending: Boolean, extern_id: String = 0, extern_status: String, extern_time: Date, forward_url: String}
  */
  async createCharge({
    name, logoUrl, price, type, address, publicKey,
    accountId, redirectUrl
  }) {
    const typeName = type === 'account' ? 'Account' : 'Domain'

    // @see https://commerce.coinbase.com/docs/api/#charges
    const charge = {
      name: `FIO ${typeName} Registration`,
      description: `Payment for ${address}`,
      logo_url: logoUrl,
      pricing_type: 'fixed_price',
      local_price: {
        amount: String(price),
        currency: 'USDC'
      },
      code: accountId,
      metadata: {
        fpk: publicKey
      },
      redirect_url: redirectUrl,
      cancel_url: redirectUrl
    }

    const result = await this.coinbase.post('/charges', charge)
    // const result = require('./examples/multitrx/1created.json').event

    if(result.data) {
      const {code, timeline, hosted_url} = result.data
      const [update] = payEvents([], [timeline[0]])

      update.extern_id = code
      update.forward_url = hosted_url

      // 3rd party payment interface
      update.pricing = result.data.pricing
      update.addresses = result.data.addresses


      return update
    }

    throw new Error(JSON.stringify(result))
  }

  /*
    @plugin required for In-app purchases (not forwarded to coinbase)
    @return {success: string}, or {error: string} or throw error
  */
  async cancelCharge(extern_id) {
    const charge = await this.coinbase.post('/charges/' + extern_id)

    if(charge) {
      if(charge.error) {
        return {error: 'Charge ' + charge.error.message || charge.error}
      }
      if(charge.timeline) {
        const line = charge.timeline[charge.timeline.length - 1]
        return {success: line.status}
      }
    }

    this.debug({error: 'unexpected cancel charge response'}, response)
    return {error: 'Unknown Coinbase response'}
  }

  /**
    @example res.sendStatus(200) -- A successful status code must be sent to acknowledge the request.

    @example <code> // Call
    syncEvents(extern_id, events) where events {
      pending_total: 'running total, every line must sum prior lines'
      confirmed_total: 'running total, every line must sum prior lines'
      pending: isPending === undefined ? true : isPending, // never null
      event_id: String(event_id), // sequence start at 0
      extern_status: processors_status,
      extern_time: time,
      metadata // json data or errors for investigation
    }</code>

    @example await cb()
    @plugin optional
  */
  async webhook(req, res) {
    const sig = req.headers['x-cc-webhook-signature']
    if(!sig) {
      return res.status(401).send({error: 'Unauthorized'})
    }

    const hash = createHmac('sha256', process.env.COINBASE_WEBHOOK_SECRET)
      .update(req.rawBody).digest().toString('hex')

    if(sig !== hash) {
      console.error(this.getDisplayName() + ' webook signature did not match');
      return res.status(401).send({error: 'Unauthorized'})
    }

    if(this.debug.enabled !== false) {
      this.debug('WEBHOOK', this.getDisplayName(),
        JSON.stringify(req.body));
    }

    const {event} = req.body
    const {type} = event

    // webhook event.type will all be reflected in the timeline
    if(!webhookEventTypes[type]) {
      console.warn(`[Coinbase plugin] Unexpected webhook event type ${type} ${event.id}`);
    }

    if(type === 'charge:created') {
      // Already created in createCharge
      return res.sendStatus(200)
    }

    const {code, timeline, payments} = event.data
    const events = payEvents(payments, timeline)
    await this.syncEvents(code, events)

    // let webhook know not to re-try
    return res.sendStatus(200)
  }

  /**
    <p>"Refresh" button or server process that would re-refresh on certain
    conditions.</p>

    <p>Update charge history incase webhook events were not available.  This
    may be linked to a refresh button in the Admin interface.</p>

    @throws {Error} "Not Implemented" if a code is not provided.  In the
    future a 'null' code could return a load of all Conbase transactions
    since a save point (this impl may save that in metadata).  This will
    find any transactions that are missing.

    @arg {string} code - coinbase code or id
  */
  async updateChargeHistory(code, /*{metadata}*/) {
    if(!code) {
      throw new Error('Not implemented')
      // const cbEvents = await this.coinbase.get(`/events`)
    }
    const result = await this.coinbase.get(`/charges/${code}`)
    if(result.data && typeof Array.isArray(result.data.timeline)) {
      const {timeline, payments} = result.data
      const events = payEvents(payments, timeline)

      if(this.debug.enabled) {
        this.debug('updateChargeHistory', { code, events })
      }

      await this.syncEvents(code, events)
      return
    }
    throw new Error(JSON.stringify(result.error || result))
  }
}

const webhookEventTypes = {
  'charge:created': true,
  'charge:confirmed': true,
  'charge:failed': true,
  'charge:delayed': true, // payment received after expiration
  'charge:pending': true, // unconfirmed
  'charge:resolved': true // success
}

function payEvents(payments, timeline) {
  const unapplied_payment = []

  // Capture change in payment status from pending to confirmed.
  for(let payment of payments) {
    let applied = false

    // Apply payments to timeline (oldest timeline entry first)
    for(let i = timeline.length - 1; i >= 0; i--) {
      const line = timeline[i]
      if(!line.payment) {
        continue
      }

      if(
        line.payment.network === payment.network &&
        line.payment.transaction_id === payment.transaction_id
      ) {
        line.apply = {
          amount: payment.value.local.amount,
          status: payment.status
        }
        applied = true
        break
      }
    }

    if(!applied) {
      unapplied_payment.push(payment)
    }
  }

  const events = []

  for(let i = 0; i < timeline.length; i++) {
    const line = timeline[i]
    const {context, status} = line

    const extern_status = context ? context : status
    const isPending = pollingStatusMap[extern_status]
    let confirmed_total = null, pending_total = null

    const metadata = {}

    if(line.apply) {
      if(line.apply.status === 'CONFIRMED') {
        confirmed_total = line.apply.amount
      } else if(line.apply.status === 'PENDING') {
        pending_total = line.apply.amount
      } else {
        metadata.unknown_payment_status = line.apply.status
      }
    }

    events.push({
      pending: isPending === undefined ? true : isPending,
      event_id: String(i),
      extern_status,
      extern_time: line.time,
      confirmed_total,
      pending_total,
      metadata: Object.keys(metadata).length ? metadata : null
    })

  }

  // Conbase may show payments that are not in the timeline yet
  // @see ./examples/unapplied-payment.json
  for(let i = 0; i < unapplied_payment.length; i++) {
    const payment = unapplied_payment[i]

    const metadata = {}
    const isPending = pollingStatusMap[payment.status]

    let confirmed_total = null, pending_total = null

    if(payment.status === 'CONFIRMED') {
      confirmed_total = payment.value.local.amount
    } else if(payment.status === 'PENDING') {
      pending_total = payment.value.local.amount
    } else {
      metadata.unknown_payment_status = payment.status
    }

    events.push({
      pending: isPending === undefined ? true : isPending,
      event_id: String(events.length + i),
      extern_status: payment.status,
      extern_time: payment.detected_at,
      confirmed_total,
      pending_total,
      metadata: Object.keys(metadata).length ? metadata : null
    })
  }

  return events
}

module.exports = Coinbase
