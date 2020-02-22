# FIO Registrations

## Referral link

Register an address or domain under the `fio` referral code:
* https://example.com/ref/fio?publicKey=FIO...

Show the registration form with only an address or domain (respectively):
* https://example.com/address/fio?publicKey=FIO...
* https://example.com/domain/fio?publicKey=FIO...

Select a default domain (wallet) other than the one shown:
* https://example.com/address/fio/wallet?publicKey=FIO...

Route Rules

* /(address|ref)/:referralCode?/:defaultDomain?
* /(domain)/:referralCode?

## One Time Project setup

```
npm install
```

Copy then configure
```
cp .env-example .env-server
```

Compile and minify for production.  After building, expressjs will
see the `./dist` directory and serve files from there.  Remove this
directory during development.

```
npm run build
```

Create the database schema.  It will not drop tables.

```
npm run sync
```

Add the first user

```
npm run seed
```

Start the server

```
export NODE_ENV=production
node server/index.js
# OR npm run start
```

Admin interface (built and running locally)

http://localhost:5000/page/login

### Coinbase

Navigating to [Settings](https://commerce.coinbase.com/dashboard/settings) and
* Click on **Settings** > **Create an API key** (scroll down) to create a new API key; save in your `.env-server` file.

* Get the webhook secret in settings and save it in the `.env-server` file.

* Subscribe this server for webhook notifications by adding an endpoint to the Webhook subscriptions section on your Settings page within Coinbase Commerce.  The endpoint path on this server is `https://example.com/webhook/payment/coinbase`.

* If you’re using a service like ngrok for the forwarding URL. You can
whitelist localhost by adding http://localhost:8081 as a whitelisted
domain.  The endpoint will look like `https://ad4a36d3.ngrok.io/webhook/payment/coinbase`.

### Heroku

Add each variable in `.env-server` using: heroku config:set VAR=value VAR1=value

`heroku config:set CHAIN_ENDPOINT=xxx`

Add a postgres add-on and configure the Database URL.  Comment
out the PLUGIN_UPLOAD variable, Heroku does not provide persistent
disk storage.

It may be necessary to force a full npm non-cache build.  Turn caching off,
redeploy, then re-enable.

```
heroku config:set NODE_MODULES_CACHE=false
git push heroku
heroku config:set NODE_MODULES_CACHE=true
```

## Development

Example **fio-registration** webhook server.  Replace with a wallet's webhook signature verification key.

```
node server/webhook-example.js 3690 phjz6nQob7FlhlsUZNGCDJwtaLUeb0XHiFd23hCPtRY
```

If you don't have inbound Coinbase webhooks setup that should be fine.  You'll
need to use the Admin interface to "Find" your account (usually by public key)
and click to open your account or domain and click the "refresh" link.  That
will pull the latest data from Coinbase.

### Compiles and hot-reloads for development

Remove the `./dist` directory if you did a build..

```
rm -fr ./dist
npm run serve
```

Admin Interface (npm run serve)

http://localhost:8081/page/login

The `serve` target proxies API requests with a matching URL pattern to the
express server (from port 8081 to 5000).  See `vue.config.js {devServer: proxy}`.
The proxy is not needed when serving pre-built files and `npm start`.

### API Bearer Token

Under the Admin's **My Profile** page you can setup and enable a
**API Bearer Token**.

```
# Get your profile
curl -H "Authorization: Bearer I8vu0hBaG4jUeydjn6Anh4jrME5G72PsiIwmgtwesh1PM" http://localhost:5000/api/user


# Purchase a domain or account
curl --request POST -H "Authorization: Bearer I8vu0hBaG4jUeydjn6Anh4jrME5G72PsiIwmgtwesh1PM" -H "Content-Type: application/json" --data '{"referral_code":"fio","buy_price":"0.03","owner_key":"FIO5fnvQGmLRv5JLytqgvfWZfPyi4ousY46zdRU9MSSzJksFDZSYu","address":"donttreadonme","domain":"fio", "pay_status": "success"}' http://localhost:5000/api/buy

```
