const debug = require('debug')('fio:process-scheduler')

const processEvents = require('./process-events')
const processWebhooks = require('./process-webhooks')

function runScheduler() {
  console.info('--- SCHEDULER START ---');
  if(process.env.PROCESS_EVENTS_MS > 0) {
    let running = false
    function run() {
      if(running) {
        console.error(`WARN: process event overlap within PROCESS_EVENTS_MS ${process.env.PROCESS_EVENTS_MS}`)
        return
      }

      running = true

      processEvents
        .all()
        .then(() => processWebhooks.all().then(() => running = false))
        .catch(err => {
          console.error(err);
          running = false
      })
    }

    debug(`event scheduler running ${process.env.PROCESS_EVENTS_MS}ms`)
    setInterval(run, process.env.PROCESS_EVENTS_MS)
  }
}

module.exports = runScheduler;
