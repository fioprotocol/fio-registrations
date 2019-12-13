const express = require('express');
const router = express.Router();

router.get('/req-info', (req, res) => {
  res.set('content-type', 'text/plain');
  const request = safeGet(req, ['headers', 'ips', 'ip', 'connection.remoteAddress'])
  res.send(JSON.stringify({request}, null, 4))
  console.log(req.connection);
})

const safeGet = (data, names) => names.reduce((props, name) => { props[name] = name.split('.').reduce((obj, v) => obj === undefined ? undefined : obj[v], data); return props }, {})


module.exports = router;
