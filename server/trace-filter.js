
/**
  Tame the log while a scheduled process is running.
*/

// initial setup
module.exports = function(debugFn, setDebug) {
  const traceObjects = []
  let logQueue = []

  const rootDebug = debugFn()
  rootDebug.log = trace()

  // trace wrapping a function
  return function(traceObject) {
    const [functionName] = Object.keys(traceObject)
    const traceFunction = traceObject[functionName]

    const cache = traceObjects.find(o => o.traceFunction === traceFunction)
    if(cache) {
      return cache.wrap
    }

    let callingDebug
    if(setDebug) {
      callingDebug = rootDebug.extend(functionName)
      callingDebug.log = trace()
    } else {
      callingDebug = debugFn()
      callingDebug.log = trace()
    }

    // every call to debug()
    const wrap = async function(...args) {
      let prefix, debugPrev = null
      if(setDebug) {
        prefix = ''
        debugPrev = debugFn()
      } else {
        prefix = functionName + ' '
      }

      callingDebug(prefix + `enter`)

      try {
        if(debugPrev) {
          setDebug(callingDebug)
        }

        return await traceFunction(...args)
      } catch(err) {
        callingDebug(prefix + `exit`)
        throw err
      } finally {
        callingDebug(prefix + `exit`)
        if(debugPrev) {
          setDebug(debugPrev)
        }
      }
    }
    traceObjects.push({traceFunction, wrap})
    return wrap
  }

  function trace() {
    return function(...args) {
      // return console.error(...args) // by-pass
      // stringify shows color codes
      // console.error(JSON.stringify(args[0]));

      const queueLength = traceObjects.length * 2

      const debugMsg = args[0]
      const isTrace = debugMsg.endsWith('enter') || debugMsg.endsWith('exit')

      // print message and full up the queue with place holders
      if(logQueue.length < queueLength) {
        logQueue.push(null)
        console.error(...args)
        if(!isTrace) {
          logQueue = []
        }
        return
      }

      logQueue.shift()
      logQueue.push(args)

      if(!isTrace) {
        for(msg2 of logQueue) {
          if(msg2 !== null) {
            console.error(...msg2)
          }
        }
        logQueue = []
      }
    }
  }
}
