const assert = require('assert')
const router = require('express').Router();

const limit = require("express-rate-limit")
const bcrypt = require('bcryptjs')
const {authenticator} = require('otplib')

const handler = require('./handler')
const {checkEncrypt, checkDecrypt} = require('../encryption-check')
const Scak = require('./scak')
const db = require('../db/models')
const Op = require('sequelize').Op

const loginAttemptsPerHour = process.env.LOGIN_ATTEMPTS_PER_HOUR != null ?
  process.env.LOGIN_ATTEMPTS_PER_HOUR : 10

const loginLimiter = keyGenerator => limit({
  keyGenerator,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV !== 'production' ?
    Math.max(60, loginAttemptsPerHour) : loginAttemptsPerHour,
  handler: function (req, res) {
    res.send({error: 'Too many login attempts in one hour'})
  }
})

const limiters = [
  loginLimiter(req => req.ip),
  loginLimiter(req => req.body.email)
]

// initialize with side-channel timming attack data
if(process.env.NODE_ENV === 'production') {
  ;(async function() {
    const salt = bcrypt.genSaltSync(Number(process.env.BCRYPT_MAX_ROUNDS))
    const hash = bcrypt.hashSync('correct', salt)

    const scak = Scak('login')
    await db.User.findOne({where: {email: 'nomatch'}})
    await db.User.findOne({where: {email_password: 'nomatch'}})

    await bcrypt.compare('correct', hash)
    await bcrypt.compare('wrong', hash)
    scak.checkpoint() // save minimum delay
  })()
}

router.post('/public-api/login', limiters, handler(async (req, res) => {
  const {username, password, email_password} = req.body
  const failed = {error: 'Logged failed'}

  const scak = Scak('login')

  try {
    if(!username || !(password || email_password)) {
      return res.status(401).send(failed)
    }

    const user = await db.User.findOne({
      attributes: [
        'id', 'email', 'username', 'password', 'email_password',
        'force_password_change', 'mfa_enabled'
      ],
      where: { [Op.or]: { email: username, username } }
    })

    if(!user) {
      return res.status(401).send(failed)
    }

    let matches = false
    if(email_password && user.email_password) {
      const bPassword = checkDecrypt(
        process.env.DATABASE_ENCRYPT_SECRET,
        user.email_password
      ).toString()
      matches = await bcrypt.compare(email_password, bPassword)
    } else if(user.password) {
      const bPassword = checkDecrypt(
        process.env.DATABASE_ENCRYPT_SECRET,
        user.password
      ).toString()
      matches = await bcrypt.compare(password, bPassword)
    }

    if(!matches) {
      return res.status(401).send(failed)
    }

    const loginState = {
      user_id: user.id,
      username: user.username,
      login_at: new Date().toISOString(),
      force_password_change: user.force_password_change
    }

    if(user.mfa_enabled) {
      // API will continue to block requests
      res.state.pending_mfa_login = loginState
    } else {
      // API security relies on these, res.state will be signed
      Object.assign(res.state, loginState)
    }

    res.status(200).send({
      success: user.mfa_enabled ? 'Logged in, enter your MFA code' : 'Logged in',
      pending_mfa: user.mfa_enabled,
      username: user.username,
      force_password_change: user.force_password_change, // just for client-side logic
    })

    if(!user.mfa_enabled) {
      user.last_login = new Date()
      user.save()
    }
  } finally {
    scak.checkpoint()

    // Delay on good passwords too or the side-channel attacker could
    // assume a longer delay is always a bad password and abondon the connection.
    await scak.delay()
  }
}))

router.post('/public-api/change-password', limiters, handler(async (req, res) => {
  const {user_id} = res.state
  const {password} = req.body

  const scak = Scak('change-password')

  try {
    // The invite link and reset password authenticate with email.
    // The authenticated API path /api/* rejects force_password_change so
    // accept authenticated here but allow force_password_change.
    if( ! user_id) {
      return res.status(401).send({error: 'Unauthorized'})
    }

    if(!password || password.trim().length < 8) {
      return res.status(401).send({error: 'Password is too short'})
    }

    if(!/^[^ ]{8,60}$/.test(password)) {
      return res.status(401).send({error: 'Invalid password'})
    }

    const password_hash = checkEncrypt(
      process.env.DATABASE_ENCRYPT_SECRET,
      await bcrypt.hash(password, bcrypt.genSaltSync())
    )

    const [rows] = await db.User.update(
      {
        password: password_hash,
        email_password: null,
        force_password_change: false
      },
      { where: {id: user_id} }
    )

    if(rows !== 1) {
      return res.status(401).send({error: 'Unauthorized'})
    }

    res.state.force_password_change = false
    return res.send({success: 'Password updated'})

  } finally {
    scak.checkpoint()
    await scak.delay()
  }
}))

router.post('/public-api/login-mfa', limiters, handler(async (req, res) => {
  const {pending_mfa_login} = res.state
  if(!pending_mfa_login) {
    return res.status(401).send(
      'Unauthorized, call login first with a MFA enabled account'
    )
  }

  const {user_id} = res.state.pending_mfa_login

  const {code} = req.body
  const type = (
    /^[0-9]{6}$/.test(code) ? 'authentiator' :
    /^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/.test(code) ? 'backup' :
    null
  )
  assert(type, 'Expecing 6 digit authentiator code or a valid backup code')

  const scak = Scak('login')
  try {
    const mfaCol = type === 'authentiator' ? 'mfa_encrypted' : 'mfa_backup_codes'
    const userMfa = await db.UserMfa.findOne({
      attributes: ['id', mfaCol], where: {user_id}
    })

    assert(userMfa, 'User is not setup with a MFA key')

    const mfaSecret = checkDecrypt(
      process.env.DATABASE_ENCRYPT_SECRET,
      userMfa[mfaCol]
    )

    let loggedIn = false
    let codesUsed = null

    if(type === 'authentiator') {
      const pass = authenticator.check(code, mfaSecret.toString())

      if(!pass) {
        return res.status(401).send({error: 'Authenticator code expired or does not match'})
      }

      loggedIn = true
    } else if(type === 'backup') {
      const userCode = Buffer.from(code.replace(/-/g, ''), 'hex')
      const usedCode = Buffer.alloc(6)

      let found = false
      codesUsed = 0

      for (var i = 0; i < 16 * 6; i += 6) {
        const dbCode = mfaSecret.slice(i, i + 6, 'hex')
        if(dbCode.compare(usedCode) === 0) {
          codesUsed++
          continue
        }
        if(!found && dbCode.compare(userCode) === 0) {
          mfaSecret.fill(usedCode, i, i + 6)
          found = true
          codesUsed++
        }
      }

      if(found) {
        const mfa_backup_codes = checkEncrypt(
          process.env.DATABASE_ENCRYPT_SECRET,
          mfaSecret
        )
        userMfa.mfa_backup_codes = mfa_backup_codes
        await userMfa.save()
        loggedIn = true
      } else {
        return res.status(401).send({error: 'Backup code was already used or does not exist'})
      }
    }

    if(loggedIn) {
      Object.assign(res.state, res.state.pending_mfa_login)
      delete res.state.pending_mfa_login
      const result = { success: 'Logged in' }
      if(codesUsed !== null) {
        result.codesUsed = codesUsed
      }

      await db.User.update({
        last_login: new Date()
      }, {where: {id: user_id}})

      res.status(200).send(result)
    }
  } finally {
    scak.checkpoint()
    await scak.delay()
  }
}))

module.exports = router;
