const debug = require('debug')('fio:handler')

// expressjs < 5.x.x does not handle async in the Router
// https://stackoverflow.com/a/51391081/766233
const handler = function(fn) {
  return function(req, res, next) {
    return Promise
    .resolve(fn(req, res, next))
    .catch(function(error) {
      if(res.state) {
        const {user_id, username, bearer = false} = res.state
        debug(JSON.stringify({
          error: error.message,
          user_id, username, bearer
        }))
      }
      return next(error)
    })
  }
}

module.exports = handler
