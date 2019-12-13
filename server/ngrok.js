const ngrok = require('ngrok')

// Turn on the ngrok tunnel in development, which provides both the mandatory HTTPS
// support and the ability to consume webhooks locally.
ngrok
  .connect({
    addr: 5000,
    // addr: 8081,
    subdomain: process.env.NGROK_SUBDOMAIN,
    authtoken: process.env.NGROK_AUTHTOKEN,
  })
  .then(url => {
    console.log(`App URL to see the dev server in your browser: ${url}/`);
  })
  .catch(err => {
    if (err.code === 'ECONNREFUSED') {
      console.log(`Connection refused at ${err.address}:${err.port}`);
    } else {
      console.log(err);
    }
    process.exit(1);
  });
