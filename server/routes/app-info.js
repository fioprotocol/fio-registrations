const router = require('express').Router();

const plugins = require('../plugins')

router.get('/public-api/ping', async (req, res) => {
  res.send({
    data: {
      success: true,
    },
    status: 1,
  });
});

router.get('/public-api/info', async (req, res) => {
  const payment = await plugins.payment
  res.send({
    title: process.env.TITLE,

    paymentInapp: process.env.PAYMENT_INAPP === 'true' ? true :
      process.env.PAYMENT_INAPP === 'false' ? false : true,

    pay_source: {
      name: payment.getDisplayName(),
      key: process.env.PLUGIN_PAYMENT
    },
    // pay_sources: {key: name} todo: historical sources pending requirements
    uploadEnabled: plugins.upload !== undefined,
    chainEndpoint: process.env.CHAIN_ENDPOINT
  })
})

module.exports = router;
