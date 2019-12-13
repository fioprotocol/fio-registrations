const fetch = require('isomorphic-fetch')

/**
  Tailored for json APIs.  The returned `data` or `error` is resolved from
  json into an object or resolved as text depending on the servers'
  returned Content-Type header.

  @example jsonApi = require('json-api')('https://testnet.fioprotocol.io/v1/chain')
  @example await jsonApi.fetch(url, request)
  @example await jsonApi.post(url, obj)
  @example await jsonApi.get(url)
  @example await jsonApi.put(url, obj)
  @example await jsonApi.delete(url, obj)

  @example return Promise {[data || error], ok, status, statusText}
*/
module.exports = function(urlPrefix, options = {}) {
  return {
    fetch: async (url, request) => jsonFetch(urlPrefix + url, request, options),
    post: async (url, obj) => jsonFetch(urlPrefix + url, {obj, method: 'POST'}, options),
    get: async (url) => jsonFetch(urlPrefix + url, {method: 'GET'}, options),
    put: async (url, obj) => jsonFetch(urlPrefix + url, {obj, method: 'PUT'}, options),
    delete: async (url, obj) => jsonFetch(urlPrefix + url, {obj, method: 'DELETE'}, options),
  }
}

const jsonFetch = async function(url, request, options) {
  if(!request.method) {
    request.method = 'GET'
  }

  if(!request.headers) {
    request.headers = {}
  }

  if(request.method === 'GET' && request.body != null) {
    // https://stackoverflow.com/questions/978061/http-get-with-request-body
    console.warn('GET request with body')
  }

  if(request.obj) {
    if(request.body) {
      throw new Error('request contain an obj and body')
    }
    request.headers['Content-Type'] = 'application/json'
    request.body = JSON.stringify(request.obj)
    delete request.obj
  }

  let res, result
  try {
    if(options.req) {
      options.req(request)
    }

    res = await fetch(url, request)

    if(options.res) {
      options.res(res)
    }

    const jsonRes = res.headers.get("content-type") && res.headers.get("content-type").toLowerCase().includes("application/json")

    return result = await (jsonRes ? res.json() : res.text())
  } finally {
    if(options.logging) {
      const headers = res.headers.raw()
      const {ok, status, statusText} = res
      options.logging({url, request, result, ok, status, statusText, headers})
    }
  }
}
