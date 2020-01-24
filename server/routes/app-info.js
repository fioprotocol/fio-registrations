const router = require('express').Router();

const plugins = require('../plugins')

router.get('/public-api/info', async (req, res) => {
  const payment = await plugins.payment
  res.send({
    pay_source: {
      name: payment.getDisplayName(),
      key: process.env.PLUGIN_PAYMENT
    },
    // pay_sources: {key: name} TODO historical sources from database
    uploadEnabled: plugins.upload !== undefined,
    chainEndpoint: process.env.CHAIN_ENDPOINT
  })
})

module.exports = router;
