# FIO Registrations

## Referral link

Register an address or domain under the `fio` referral code:
* https://example.com/ref/fio?publicKey=FIO...

Show the registration form with only an address or domain (respectively):
* https://example.com/address/fio?publicKey=FIO...
* https://example.com/domain/fio?publicKey=FIO...

Select a default domain (wallet) other than the one shown:
* https://example.com/address/fio/wallet?publicKey=FIO...

Renew a FIO Address:
* https://reg.fioprotocol.io/address/renew/fio

Renew a FIO Domain:
* https://reg.fioprotocol.io/domain/renew/fio


Route Rules

* /(address|ref)/:referralCode?/:defaultDomain?
* /(domain)/:referralCode?

## Build and Configure

This is built using node v12 ..

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

### Database Setup

Node uses a package called Sequelize to access the database.  Any related
exceptions will likely mention Sequelize.  The user and the password below
needs to match the username and password in your `.env-server` DATABASE_URL.

```
$ sudo su - postgres -c "createuser fio"
$ sudo su - postgres -c "createdb fio-registrations"
$ sudo -u postgres psql
psql (9.6.15)
Type "help" for help.

postgres=# grant all privileges on database "fio-registrations" to fio;
GRANT
postgres=# ALTER ROLE fio WITH PASSWORD 'password';
ALTER ROLE
postgres=# ALTER DATABASE "fio-registrations" SET timezone TO 'UTC';
ALTER DATABASE
postgres=# \q
```

Create the database schema.  It will not drop existing tables.

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

* You may send all Coinbase events.  If an event is not used it will log a message and return a succesfull response.

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

## Setup

Make sure you provide a WALLET_PRIVATE_KEY to with funds in it that will be
used to pay for new addresses and/or domains.

Login to the Admin interface using the username and password you provided in
DEFAULT_USER.  http://localhost:8080/page/login

Click on "Wallets" then "Add new Wallet"

Fill in the fields, take note of the "Referral Code" which will be used
in the URL address / domain purchase URL.

Make sure to set a price for either the address or domain or both.  Check
"Address Sale Active" and/or "Domain Sale Active" to enable.  If your
setting up for free addresses, the address price can be "0" zero.

If your selling addresses, they will need a domain.  Under "Domains" enter
a public domain (a domain allowed to create addresses) that is registered
to your WALLET_PRIVATE_KEY.  This domain will appear in the public address
registration drop-down.  You may register such a domain using this server,
however it will need to be set public via another method such as the
clio command line.

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

### Curl API examples

Under the Admin **My Profile** page you can setup and enable a
**API Bearer Token**.  Each Admin user has a different token.
Under the Wallet Profile page you can setup and enable a
**API Token** to use registration endpoint for free addresses. Each Wallet Profile has a different token.

```
# Get your profile
curl -H "Authorization: Bearer I8v...1PM" http://localhost:5000/api/user

# Start the buying process where 'address' is an account or domain
curl --request POST -H "Content-Type: application/json" --data '{"referralCode":"fio","publicKey":"FIO6jN...ZbQ","address":"testing2@pubdomain"}' http://localhost:5000/public-api/buy-address

# Auto-buy an account or domain where the Wallet's referralCode sale price is configured to $0 (free)
curl --request POST -H "Content-Type: application/json" --data '{"referralCode":"fio","publicKey":"FIO6jN...ZbQ","address":"testing2@pubdomain","apiToken": "I8v...1PM"}' http://localhost:5000/public-api/buy-address
```
