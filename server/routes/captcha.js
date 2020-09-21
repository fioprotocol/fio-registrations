const express = require('express');
const { createHmac } = require('crypto')
const router = express.Router();
const handler = require('./handler')
const geeTest = require('../geetest')

router.get("/public-api/gt/register-slide", handler(async (req, res) => {
  if (process.env.GEETEST_CAPTCHA_SKIP) {
    const captchaHash = skipCaptchaHash(`${req.headers[process.env.IP_HEADER_PROP_NAME]}${Date.now()}`)
    global.captchaHashes[captchaHash] = true
    return res.send({ skipCaptcha: captchaHash, success: false });
  }
  geeTest.register(null, function (err, data) {
    if (err) {
      console.error(err);
      res.status(500);
      res.send(err);
      return
    }

    if (!data.success) {
      res.send(data);
    } else {
      res.send(data);
    }
  });
}));

const skipCaptchaHash = data =>
  createHmac('sha256', process.env.GEETEST_CAPTCHA_SKIP)
    .update('GEETEST_CAPTCHA_SKIP').update(data)
    .digest().toString('base64')

module.exports = router;
