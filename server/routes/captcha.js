const express = require('express');
const router = express.Router();
const handler = require('./handler')
const geeTest = require('../geetest')


router.get("/public-api/gt/register-slide", handler(async (req, res) => {
  geeTest.register(null, function (err, data) {
    if (err) {
      console.error(err);
      res.status(500);
      res.send(err);
      return;
    }

    if (!data.success) {
      // apirefer

      data.fallback = true;
      res.send(data);
      // todo
    } else {
      data.fallback = false;
      res.send(data);
    }
  });
}));

module.exports = router;
