const debug = require('debug')('fio:api:info')
debug.error = require('debug')('fio:api:error')

const FioApi = require('./fio-api')

class FioApiDefaults extends FioApi {
  constructor(chainEndpoint, options = {}) {
    if(!options.chainId) {
      options.chainId = process.env.CHAIN_ID
    }

    if(!chainEndpoint) {
      chainEndpoint = process.env.CHAIN_ENDPOINT
    }

    if(debug.enabled) {
      options.logging = msg => {
        const error = msg.error || (msg.result && msg.result.error) || (msg.ok === false && msg)
        if(error) {
          debug.error(msg)

          const err = []
          if(msg.request && msg.request.body) {
            // console.log may hide body
            err.push({body: JSON.stringify(msg.request.body, null, 4)})
          }
          if(msg.result && msg.result.fields) {
            // console.log hides arrays
            err.push({fields: JSON.stringify(msg.result.fields, null, 4)})
          }
          if(err.length) {
            debug.error(err)
          }
        } else {
          debug(JSON.stringify(msg, null, 4))
        }
      }
    }
    super(chainEndpoint, options)
  }
}

module.exports = {
  FioApi: FioApiDefaults,
  fio: new FioApiDefaults()
}
