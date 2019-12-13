const debug = require('debug')('fio:scak')

/** Timming data is global across instantiations of Scak */
const acks = {}

/**
  Side Channel Timming Attack Protection

  <br/>
  When the server starts, initialize the Scak instance with a unique `key`
  then run slower operations and call `scak.checkpoint()`.  The checkpoint
  saves the delay.  The production method should construct the Scak instance
  with the same `key` then call `await scak.delay()` before any value is
  returned to ensure that the function will never return faster than the
  checkpoint.

  <br/>
  Delay on success too (example successful logins) too or the side-channel
  attacker could gain an advantage knowing that a longer delay is always a
  bad password and abondon the connection early.
*/
function Scak(key, {minDelay = 0} = {}) {
  if(!acks[key]) {
    acks[key] = 0
  }

  var debugKey
  if(debug.enabled) {
    debugKey = debug.extend(key)
  }

  const start = Date.now()

  if(debugKey) {
    debugKey('timmer started');
  }

  return {
    /**
      Save the end-time for a checkpoint with a given key.  Multiple calls
      may increase the dealy but never decrease the delay.
    */
    checkpoint() {
      const elapsed = Date.now() - start

      if(debugKey) {
        if(acks[key] === 0) {
          debugKey('checkpoint elapsed', elapsed);
        } else {
          debugKey('checkpoint elapsed', elapsed, 'of', acks[key], 'ms');
        }
      }

      acks[key] = Math.max(acks[key], elapsed)
    },

    async delay() {
      const elapsed = Date.now() - start
      const totalDelay = acks[key]
      const delay = totalDelay - elapsed

      if(debugKey) {
        debugKey('delay', Math.max(minDelay, delay))
        // debugKey('delay', delay, 'min delay', Math.max(minDelay, delay)), {totalDelay, elapsed})
      }

      return new Promise(resolve => {
        setTimeout(() => resolve(), Math.max(minDelay, delay))
      })
    }
  }
}

module.exports = Scak
