const express = require('express');
const router = express.Router();
const app = express()

const crypto = require('crypto')
const {createHmac} = crypto

if(process.argv.length !== 4) {
  console.error('\n', `usage: port webhook_shared_secret`)
  console.error('\n', `$ node server/webhook-example.js 3690 's4o2dGqvxhsnT7T9yiNnJJVqSVwp1r786hlfZGT80lt67BY'`, '\n')
  return
}

const port = Number(process.argv[2])
const sharedSecret = process.argv[3]

// Raw body needed to verify webhook signatures
app.use(
  express.json({
    verify: function(req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    }
  })
);

router.post('/webhook/:error?', (req, res) => {
  const {headers, body} = req

  const requestSignature = req.headers['x-cc-webhook-signature']
  const bodySignature = createHmac('sha256', sharedSecret)
    .update(req.rawBody).digest().toString('hex')

  // Do not process any request unless the signature matches
  const signatureMatches = requestSignature === bodySignature

  // Simulate an error response, webhook should re-try until 200 is returned
  const status = signatureMatches ? req.params.error ? 400 : 200 : 401
  const message = req.params.error ? req.params.error :
    status === 200 ? 'OK' :
    status === 400 ? 'Bad Request' :
    status === 401 ? 'Unauthorized' :
    'Unknown'

  if(body.data.pay_metadata) {
    // keep console.error from summarizing with '[Object]'
    body.data.pay_metadata = JSON.stringify(body.data.pay_metadata)
  }

  if(body.data.trx_metadata) {
    // keep console.error from summarizing with '[Object]'
    body.data.trx_metadata = JSON.stringify(body.data.trx_metadata)
  }

  console.error({
    path: req.originalUrl, headers, body,
    bodySignature,
    requestSignature,
    signatureMatches, 
    response: {status}
  })

  if(req.params.error !== 'hang') {
    return res.status(status).send(message)
  }
})

app.use('/', router)

app.listen(port, () => console.log(
  `webhook-example.js listening http://localhost:${ port }/webhook`
))
