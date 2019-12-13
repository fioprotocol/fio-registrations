const JsonFetch = require('./json-fetch')

// For login persistance across API calls, import this as a singleton using ./index.js

class Server {
  constructor(httpEndpoint = '', options = {}) {
    this.state = {}

    options.res = response => {
      const stateString = response.headers.get('state')
      const notFound = response.status === 404

      // Update state in all cases except when a URL is not found AND the server
      // did not send back a new signed state.
      if(stateString && !(notFound && !stateString)) {
        this.stateString = stateString
        this.stateHash = response.headers.get('state-hash')
        this.state = new Proxy(JSON.parse(this.stateString), {
          set: function() {
            throw new Error('Call /api/* endpoints to update authenticated state')
          }
        })
      }
    }

    options.req = request => {
      if(this.stateString) {
        request.headers['state'] = this.stateString
        request.headers['state-hash'] = this.stateHash
      }
    }

    this.fetch = JsonFetch(httpEndpoint, options)
  }

  /** Generic api calls, like `/api/*` */
  async post(path, data) {
    return this.fetch.post(path, data)
  }

  /** Generic api calls, like `/api/*` */
  async get(path) {
    return this.fetch.get(path)
  }

  async getAppInfo() {
    return this.fetch.get('/public-api/info')
  }

  async getRefWallet(referralCode = null) {
    return this.fetch.post('/public-api/ref-wallet', {referralCode})
  }

  async getRefDomains(referralCode = null) {
    return this.fetch.post('/public-api/ref-domains', {referralCode})
  }

  async logout() {
    this.state = {}
  }
}

module.exports = Server
