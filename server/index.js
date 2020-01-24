const {resolve} = require('path');

// Load environment variables from the `.env-server` file.
require('dotenv').config({
  path: resolve(process.cwd(), '.env-server')
});

const handler = require('./routes/handler')

if('' || process.env.WALLET_PRIVATE_KEY === '') {
  throw new Error(`Configure a WALLET_PRIVATE_KEY in ./.env-server`)
}

if('' || process.env.DATABASE_ENCRYPT_SECRET === '') {
  throw new Error(`Configure a DATABASE_ENCRYPT_SECRET in ./.env-server`)
}

if('' || process.env.SERVER_AUTH_STATE_SECRET === '') {
  throw new Error(`Configure a SERVER_AUTH_STATE_SECRET in ./.env-server`)
}

const express = require('express');
const limit = require("express-rate-limit")

const fs = require('fs')

const AuthState = require('./routes/auth-state')

// Check for missing plugins
const plugins = require('./plugins')
if(!plugins.payment) { throw new Error(`Missing payment plugin`) }
if(!plugins.email) { throw new Error(`Missing email plugin`) }

const app = express()

// Raw body needed to verify webhook signatures.
app.use(
  express.json({
    limit: '3mb', // larger due to encoding
    verify: function(req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    }
  })
);

const webhookLimit = limit({
  windowMs: 10 * 1000, max: 40000,
  message: 'Too many requests',
})
app.use('/webhook/', webhookLimit, plugins.router);

// https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', Boolean(process.env.TRUST_PROXY))

const appLimit = limit({
  windowMs: 10 * 1000, max: 40,
  message: 'Too many requests',
  handler: function (req, res, next) {
    if(req.path === '/') {
      return res.status(this.statusCode).send(this.message);
    }
    const {current, limit} = req.rateLimit
    const delay = (current - limit) * (1/this.max)
    // console.log(req.path, req.rateLimit, delay)
    if(delay > 5) {
      return res.status(this.statusCode).send(this.message);
    }
    setTimeout(function() { next() }, delay * 1000)
  }
})

app.use(appLimit)

// keep signed server state between API calls
app.use(handler(async function(req, res, next) {
  // extra authorization check
  const required = /^\/api\//.test(req.path)

  let bearer
  const authorization = req.get('authorization')
  if(/^Bearer /.test(authorization)) {
    bearer = authorization.substring('Bearer '.length)
  }

  // validate and re-parse prior server-state from the client
  res.state = await AuthState({
    stateString: req.get('state'),
    stateHash: req.get('state-hash'),
    bearer,
    required
  })

  // Server routes may modify this state
  const send = res.send.bind(res)
  res.send = function(body) {
    // re-hash and send it back to the client
    const [state, hash] = res.state.serialize
    res.set('state', state);
    res.set('state-hash', hash);
    return send(body)
  }
  next()
}))

// normalize 'success' and 'error' response format
app.use(function(req, res, next) {
  const send = res.send.bind(res)
  res.send = function(body) {
    if(typeof body === 'object') {
      if(body.success !== undefined && body.error === undefined) {
        body.error = null
      }
      if(body.error !== undefined && body.success === undefined) {
        body.success = null
      }
    }
    return send(body)
  }
  next()
})

app.use('/', require('./routes/login'));
app.use('/', require('./routes/wallet'));
app.use('/', require('./routes/app-info'));
app.use('/', require('./routes/account'));
app.use('/', require('./routes/upload'));
app.use('/', require('./routes/api-bearer'));
app.use('/', require('./routes/mfa'));

// '/api/' has extra authentication check in AuthState above
app.use('/api/', require('./routes/admin'));
app.use('/api/', require('./routes/admin-api'));
app.use('/api/', require('./routes/webhook'));

app.use(function(err, req, res, next) {
  let state = null
  if(res.state) {
    state = {
      user_id: res.state.user_id,
      username: res.state.username,
    }
  }

  res.status(500).send({
    error: err.message,
    success: null,
    state: res.state
  });
  if (res.headersSent) {
    return next(err);
  }
});

if(fs.existsSync('./dist')) {
  console.log(`Serving web files from ./dist`)

  //const staticConf = { maxAge: '1y', etag: false }
  app.use(express.static('dist'))

  app.get('/*', (req, res) => {
    res.sendFile(resolve('./dist/index.html'));
  })
}

require('./process-scheduler')

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
