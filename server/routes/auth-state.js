const crypto = require('crypto')
const {createHmac} = require('crypto')
const db = require('../db/models')

module.exports = async function({
  stateString, stateHash, bearer, required
}) {

  // authenticated state
  let state = {}

  if(stateString) {
    if(stateHash !== serverHash(stateString)) {
      console.error(`invalid request state`, stateString, stateHash);
      throw new Error(`Invalid state`);
    } else {
      state = JSON.parse(stateString)
    }
  }

  if(!stateString && bearer) {
    const hash = crypto.createHash('sha256')
      .update(bearer).digest().toString('hex')

    const userApi = await db.UserApi.findOne({
      attributes: ['id'],
      where: {api_bearer_hash: hash},
      include: {
        model: db.User,
        required: true,
        // see login.js /public-api/login
        attributes: ['id', 'username', 'force_password_change'],
        where: { api_enabled: true }
      }
    })

    if(!userApi) {
      throw new Error('Invalid or disabled Bearer token')
    }

    const user = userApi.User

    state = {
      user_id: user.id,
      username: user.username,
      login_at: new Date().toISOString(),
      force_password_change: user.force_password_change,
      bearer: true
    }

    userApi.last_used = new Date().toISOString()
    userApi.save() // await intentionally omitted
  }

  if(required) {
    if (!state.user_id || !state.login_at) {
      throw new Error('Unauthorized')
    }
    if (state.force_password_change) {
      throw new Error('Please change your password')
    }
  }

  Object.defineProperty(state, 'serialize', {
    writeable: false,
    enumerable: false,
    get: function() {
      const ser = JSON.stringify(this)
      if(this.bearer) {
        return ['', '']
      }
      return [ser, serverHash(ser)]
    }
  })

  return state
}

const serverHash = data =>
  createHmac('sha256', process.env.SERVER_AUTH_STATE_SECRET)
  .update('SERVER_AUTH_STATE_SECRET').update(data)
  .digest().toString('base64')
