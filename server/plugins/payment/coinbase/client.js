const JsonFetch = require('../../../../src/api/json-fetch')
const {pendingStatusMap} = require('./common')

class Coinbase {
  constructor() {
    const req = request => {
      request.headers['X-CC-Version'] = '2018-03-22'
    }

    this.coinbase = new JsonFetch('https://api.commerce.coinbase.com', {req})
  }

  /*
    @plugin required for In-app purchases (not forwarded to coinbase)

    @return <code>{error: String}</code>
    @return <code>{String}</code>
  */
  async getCharge(extern_id) {
    const charge = await this.coinbase.get('/charges/' + extern_id)
    // const charge = require('./examples/charge')

    if(charge.error) {
      return {error: charge.error.message || charge.error}
    }

    const {
      addresses, expires_at, hosted_url,
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
}

module.exports = Coinbase
