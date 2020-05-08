const Geetest = require('gt3-sdk');

const captcha = new Geetest({
  geetest_id: process.env.GEETEST_ID,
  // geetest_id: 'dsfs4wwesr',
  geetest_key: process.env.GEETEST_KEY
});

module.exports = captcha;
