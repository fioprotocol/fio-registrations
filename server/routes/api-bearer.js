const assert = require('assert')
const crypto = require('crypto')
const router = require('express').Router();
const handler = require('./handler')

const db = require('../db/models')
const sequelize = require('sequelize')
const {Op} = sequelize

if(!process.env.DATABASE_ENCRYPT_SECRET) {
  throw new Error(`Required: process.env.DATABASE_ENCRYPT_SECRET`)
}

router.get('/api/api-generate', handler(async (req, res) => {
  if(!res.state.username) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const sharedSecret = crypto.randomBytes(35).toString("base64").replace(/[\+\/=]/g, "")

  return res.send({success: {sharedSecret}})
}))

router.post('/api/api-update', handler(async (req, res) => {
  if(!res.state.user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const {sharedSecret} = req.body
  assert(/^[0-9a-zA-Z]{33,47}$/.test(sharedSecret), 'Required json body api: sharedSecret')

  const api_bearer_hash = crypto.createHash('sha256')
    .update(sharedSecret).digest().toString('hex')

  const created = await db.UserApi.upsert({
    user_id: res.state.user_id,
    api_bearer_hash
  })

  return res.send({ success: created ? 'Created' : 'Updated' })
}))

router.post('/api/wallet-api-update', handler(async (req, res) => {
  if (!res.state.user_id) {
    return res.status(401).send({error: 'Unauthorized'})
  }

  const { sharedSecret, walletId } = req.body
  assert(/^[0-9a-zA-Z]{33,47}$/.test(sharedSecret), 'Required json body api: sharedSecret')

  const api_bearer_hash = crypto.createHash('sha256')
    .update(sharedSecret).digest().toString('hex')

  const walletApi = await db.WalletApi.findOne({
    where: { wallet_id: walletId },
  })
  let isNew = false
  if (walletApi && walletApi.wallet_id) {
    walletApi.api_bearer_hash = api_bearer_hash
    await walletApi.save()
  } else {
    isNew = true
    await db.WalletApi.create({
      wallet_id: walletId,
      api_bearer_hash
    })
  }

  return res.send({ success: isNew ? 'Created' : 'Updated' })
}))

module.exports = router;
