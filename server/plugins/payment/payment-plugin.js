const debug = require('debug')('fio:payment-plugin')
const trace = debug.extend('trace')

const db = require('../../db/models')
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

  // async to ensure the events can be recorded before function exits
  const newEvents = await dbSyncEvents(extern_id, events)

  if(newEvents.length) {
    const lastEvent = newEvents[newEvents.length - 1]
    if(lastEvent.pay_status === 'success') {
      // non-async, don't make the caller wait on processing the events
      broadcastPaidNeedingAccounts()
    }
  }
}

async function dbSyncEvents(extern_id, events) {
  const accountPay = await db.AccountPay.findOne({
    attributes: ['id'],
    where: {
      // unique index: pay_source, extern_id
      pay_source: process.env.PLUGIN_PAYMENT,
      extern_id,
    }
  })
  if(!accountPay) {
    throw new Error(`Account pay record for "${process.env.PLUGIN_PAYMENT}" extern_id ${extern_id} not found`)
  }

  const dbEvents = await db.AccountPayEvent.findAll({
    attributes: ['event_id'],
    where: {
      account_pay_id: accountPay.id,
      event_id: {
        [Op.in]: events.map(e => String(e.event_id))
      }
    }
  })

  const rowByEventId = {}
  for (var i = 0; i < dbEvents.length; i++) {
    const row = dbEvents[i]
    rowByEventId[row.event_id] = row
  }

  const newEvents = []
  for (var i = 0; i < events.length; i++) {
    const event = events[i]
    const row = rowByEventId[event.event_id]
    if(row) {
      continue
    }
    newEvents.push(event)
  }

  newEvents.forEach(event => {
    event.account_pay_id = accountPay.id
  })

  if(newEvents.length) {
    await db.AccountPayEvent.bulkCreate(newEvents)
  }

  return newEvents
}

module.exports = {
  syncEvents
}
