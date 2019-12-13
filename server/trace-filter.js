
/**
  Hide redundant trace messages (messages that consist only of a
  traceFunction name) until a non-matching message is logged.

  This is used to tame the log while a scheduled process is running.
*/
module.exports = function(traceFunctions) {
  let logQueue = []
  const consoleError = console.error.bind(console)

  return function(...args) {
    // print recent trace messages before and after an interesting message (gives timming info)..
    if(logQueue.length < traceFunctions.length) {
      logQueue.push(null)
      consoleError(...args)
      return
    }
    const msg = args[0].split(' ')[3]
    for (fname of traceFunctions) {
      if(msg.endsWith(fname + '()')) {
        logQueue.push(args)

        // console.log(msg.length, fname.length + '()'.length + `\u001b[0m`.length, msg);
        if(msg.length > fname.length + '()'.length + `\u001b[0m`.length) {
          // A longer message or non-function named message is a message of interest
          break
        }
        for (var i = 0; i < logQueue.length - traceFunctions.length; i++) {
          // delete old redundant trace message
          logQueue.shift()
        }
        return
      }
    }

    for(msg2 of logQueue) {
      if(msg2 !== null) {
        consoleError(...msg2)
      }
      logQueue = []
    }
  }
}
