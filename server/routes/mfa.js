const assert = require('assert')
const crypto = require('crypto')
const router = require('express').Router();
const handler = require('./handler')

const db = require('../db/models')
const sequelize = require('sequelize')
const {Op} = sequelize

const {authenticator} = require('otplib')
const {checkEncrypt} = require('../encryption-check')

if(!process.env.DATABASE_ENCRYPT_SECRET) {
  throw new Error(`Required: process.env.DATABASE_ENCRYPT_SECRET`)
}

const service = process.env.TWOFA_SERVICE;
if(!process.env.TWOFA_SERVICE) {
  throw new Error('Required: process.env.TWOFA_SERVICE')
}

router.get('/api/mfa-generate', handler(async (req, res) => {
  if(!res.state.username) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const sharedSecret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(res.state.username, service, sharedSecret)

  const backupCodes = []

  for (var i = 0; i < 16; i++) {
    const code = crypto.randomBytes(6).toString('hex') //'855f-5efb-9e89'
      .split(/(.{4})/g).filter(el => el !== '').join('-') // add dashes

    backupCodes.push(code)
  }

  return res.send({success: {sharedSecret, otpauth, backupCodes}})
}))

router.post('/api/mfa-update', handler(async (req, res) => {
  if(!res.state.user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }
  const {code, sharedSecret, backupCodes} = req.body

  assert(/^[0-9]{6}$/.test(code), 'Required json body 6 digit mfa: code')
  assert(/^[0-9A-Za-z]{10,}$/.test(sharedSecret), 'Required json body mfa: sharedSecret')
  assert(Array.isArray(backupCodes) && backupCodes.length === 16,
    'Required json body 16 element array: backupCodes')

  const pass = authenticator.check(code, sharedSecret)
  if(!pass) {
    return res.status(401).send({error: 'Authenticator code expired or does not match'})
  }

  // console.log(backupCodes);

  const bcBuffer = Buffer.alloc(16 * 6)
  let pos = 0
  for (var i = 0; i < 16 * 6; i += 6) {
    const backupCode = backupCodes[pos++]
    assert(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/.test(backupCode),
      'Invalid backup code, call /api/mfa-generate first')

    bcBuffer.fill(backupCode.replace(/-/g, ''), i, i + 6, 'hex')
  }
  // console.log(bcBuffer.toString('hex'));

  const mfa_encrypted = checkEncrypt(
    process.env.DATABASE_ENCRYPT_SECRET,
    sharedSecret
  )

  const mfa_backup_codes = checkEncrypt(
    process.env.DATABASE_ENCRYPT_SECRET,
    bcBuffer
  )

  const created = await db.UserMfa.upsert({
    user_id: res.state.user_id,
    mfa_encrypted, mfa_backup_codes,
  })

  return res.send({ success: created ? 'Created' : 'Updated' })
}))

module.exports = router;
