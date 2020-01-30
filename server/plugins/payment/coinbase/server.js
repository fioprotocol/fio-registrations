const JsonFetch = require('../../../../src/api/json-fetch')
const createHmac = require('create-hmac')

if(!process.env.COINBASE_API_KEY) {
  throw new Error('Required: process.env.COINBASE_API_KEY');
}

if(!process.env.COINBASE_WEBHOOK_SECRET) {
  throw new Error('Required: process.env.COINBASE_WEBHOOK_SECRET');
}

/**
  Map Coinbase status (key) to show when a transaction is no longer pending.
  A pending status will get polled for updates.
*/
const pendingStatusMap = {
  // https://commerce.coinbase.com/docs/api/#charge-resource
  'NEW': true,
  'PENDING': true,
  'MULTIPLE': true,
  'UNRESOLVED': true,

  'COMPLETED': false,
  'EXPIRED' : false,
  'RESOLVED': false,
  'CANCELED' : false,
  'UNDERPAID': false,
  'OVERPAID': false,
  'DELAYED': false,
  'MANUAL': false,
  'OTHER': false
}

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
    Open a payment transaction at coinbase.

    @plugin required

    <code>
    return {
      event_id: String = 0, // Tracks status updates, date+time is not unique
      extern_id: String, // Is a unique ID (seq 0..n) for timeline event (used to filter prior status lines and pick up new ones)
      extern_status: String, // is any status the processor returns
      extern_time: Date, // is a time stamp returned by the processor
      forward_url: String // (optional) if provided, server be configured to ignore
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
      const update = timelineUpdate(0, timeline[0])
      update.extern_id = code
      update.forward_url = hosted_url
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

  /*
    @plugin required for In-app purchases (not forwarded to coinbase)

    @return <code>{error: String}</code>
    @return <code>{String}</code>
  */
  async getCharge(extern_id) {
    // const charge = await this.coinbase.get('/charges/' + extern_id)
    const charge = require('./examples/charge')

    if(charge.error) {
      return {error: charge.error.message || charge.error}
    }

    const {
      addresses, created_at, expires_at, hosted_url,
      payments, pricing, timeline
    } = charge.data

    const {context, status} = timeline[timeline.length - 1]
    const pending = pendingStatusMap[context ? context : status]
    const detected = status === 'NEW' ? false : true

    return {
      pending,// Boolean
      detected, // true after payment is detected
      pricing,// {..., ethereum: {amount: "0.000175000", currency: "ETH"}}
      addresses,// {..., ethereum: "0x..."}
      expires_at,
      hosted_url,// optional
      payments: payments.map(payment => {// Array
        const {network, transaction_id, status, value} = payment
        // value = {
        //   local: {amount: "0.014612", currency: "USDC"},
        //   crypto: {amount, currency}
        // }
        const {confirmations, confirmations_required} = payment.block || {}
        return {
          network, transaction_id, status, value,
          confirmations, confirmations_required
        }
      })
    }
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
    const events = timeline.map(
      (line, id) => timelineUpdate(id, line, payments))

    await this.syncEvents(code, events) // ensure events are recorded
    res.sendStatus(200) // let webhook know not to re-try
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
      const events = timeline.map(
        (line, id) => timelineUpdate(id, line, payments))

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

/** Total payments for each line in the timeline */
function totalPaymentsByStatus(payments, upToDateStr) {
  const upTo = new Date(upToDateStr).getTime()
  const totals = {}
  for (var i = 0; i < payments.length; i++) {
    const {status, detected_at, value} = payments[i]
    const detected = new Date(detected_at).getTime()
    if(detected <= upTo) {
      if(!totals[status]) {
        totals[status] = 0
      }
      const {amount} = value.local
      totals[status] += Number(amount)
    }
  }
  return totals
}

function timelineUpdate(event_id, line, payments) {
  const {status, time, context} = line
  const metadata = {}

  const isPending = pendingStatusMap[context ? context : status]
  if(isPending === undefined) {
    const err = `Unknown status ${status} or context ${context}`
    console.error(`[Coinbase plugin] ${err}`)
    metadata.unknown_status = err
  }

  if(
    (context && status !== 'UNRESOLVED') ||
    (status === 'UNRESOLVED' && !context)
  ) {
    const err = `REVIEW: Unexpected context ${context} for provided status ${status}`
    console.error(`[Coinbase plugin] ${err}`)
    metadata.unexpected_status = err
  }

  let confirmed_total, pending_total
  if(payments) {
    const total_usd = totalPaymentsByStatus(payments, time)

    confirmed_total = total_usd['CONFIRMED']
    delete total_usd['CONFIRMED']

    pending_total = total_usd['PENDING']
    delete total_usd['PENDING']

    if(Object.keys(total_usd).length) {
      Object.assign(metadata, {total_usd})
    }
  }

  // Extra payment info if exists
  const keys = Object.keys(line)
  for (var i = 0; i < keys.length; i++) {
    const key = keys[i]
    if(key !== 'status' && key !== 'time' && key !== 'context') {
      metadata[key] = line[key]
    }
  }

  // Success is not needed, it set by the server-process when
  // confirmed_total >= buy_price.  Pending === false is an indicator
  // that the transaction does not need to be monitored anymore.
  return {
    pending: isPending === undefined ? true : isPending,
    event_id: String(event_id),
    extern_status: context ? context : status,
    extern_time: time,
    confirmed_total,
    pending_total,
    metadata: Object.keys(metadata).length ? metadata : null
  }
}

module.exports = Coinbase
