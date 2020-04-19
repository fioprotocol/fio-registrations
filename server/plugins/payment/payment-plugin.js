const debug = require('debug')('fio:payment-plugin')
const trace = debug.extend('trace')

const db = require('../../db/models')
const transactions = require('../../db/transactions')
const {Op} = db.Sequelize
const {
  broadcastPaidNeedingAccounts
} = require('../../process-events')

/**
  Create AccountPayEvent records events that do not exist.  If the
  last event is a new payment 'success', start a process in the background
  to register the account or domain on the blockchain.
*/
async function syncEvents(extern_id, events) {
  trace('syncEvents()')

  // await to ensure the events can be recorded or let the error notify
  const newEvents = await dbSyncEvents(extern_id, events)

  if(newEvents.length) {
    const lastEvent = newEvents[newEvents.length - 1]
    if(lastEvent.pay_status === 'success') {
      // skip await, don't make the caller wait on background processing
      broadcastPaidNeedingAccounts()
    }
  }
}

async function dbSyncEvents(extern_id, events) {
  events = JSON.parse(JSON.stringify(events))

  const accountPay = await db.AccountPay.findOne({
    attributes: ['id', 'buy_price', 'account_id'],
    where: {
      // unique index: pay_source, extern_id
      pay_source: process.env.PLUGIN_PAYMENT,
      extern_id,
    }
  })

  if(!accountPay) {
    debug(`Account pay record for "${process.env.PLUGIN_PAYMENT}" extern_id ${extern_id} not found`)
    return [] // non-error avoids lots of webhook retry attempts
  }

  let balance = null

  async function lookupBalance(transaction) {
    if(balance !== null) {
      return balance
    }
    const {owner_key} = await db.Account.findOne({
      attributes: ['owner_key'], where: {id: accountPay.account_id}
    })
    const bal = await transactions.balance(owner_key, {transaction})
    return balance = +Number(bal.total)
  }

  return await db.sequelize.transaction(async transaction => {
    await db.AccountPayEvent.destroy({
      where: { account_pay_id: accountPay.id },
      transaction
    })

    let confirmed_total = 0

    const eventp = events.map(async event => {
      event.account_pay_id = accountPay.id

      // If the money is confirmed let the purchase go through, ignore all other
      // status conditions (like overpay, multipay, etc.)
      confirmed_total += +Number(event.confirmed_total).toFixed(2)
      const buy_price = +Number(accountPay.buy_price)

      let paid = false
      if(confirmed_total > 0) {
        if(confirmed_total >= buy_price) {
          paid = true
        } else {
          const balance = await lookupBalance(transaction)
          paid = confirmed_total >= Number(buy_price + balance).toFixed(2)
        }
      }

      if(debug.enabled) {
        debug({paid, balance, confirmed_total, buy_price,
          account_id: accountPay.account_id})
      }

      if(paid) {
        event.pay_status = 'success'
      } else {
        if(event.pending === false) {
          event.pay_status = 'cancel'
          event.pay_status_notes = confirmed_total > 0 ? 'Insufficient funds' : null
        } else if(event.pending === true) {
          event.pay_status = 'pending'
        } else { // event.pending === undefined
          event.pay_status = 'review'
        }
        delete event.pending
      }
    })

    if(events.length) {
      await Promise.all(eventp)
      await db.AccountPayEvent.bulkCreate(events, {transaction})
    }

    return events
  })
}

module.exports = {
  syncEvents
}
