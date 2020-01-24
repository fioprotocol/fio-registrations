const debug = require('debug')('fio:plugins')

const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const handler = require('../routes/handler')

const {syncEvents} = require('./payment/payment-plugin')

function requireServer(type, name) {
  const serverJs = path.join(type, name, 'server.js')
  const searchPath = [
    path.join(process.env.HOME, '.fio-registrations', serverJs),
    path.join(__dirname, serverJs)
  ]

  const exist = searchPath.find(path => {
    try {
      return fs.lstatSync(path).isFile()
    } catch(err) {}
  })

  if(!exist) {
    throw new Error(`Missing ${type}/${name}/server.js in search path ${searchPath.join(' ')}`)
  }
  return require(exist)
}

function regWebhook(type, name, webhook, pdebug) {
  if(pdebug.enabled) {
    pdebug('Route POST ' + `/webhook/${type}/${name}`);
  }
  router.post(`/${type}/${name}`, handler(
    (req, res) => webhook(req, res)
  ))
}

function newInstance(type, name, args = {}) {
  const pdebug = debug.extend(type + ':' + name)
  if(pdebug.enabled) {
    pdebug(path.join(__dirname, type, name))
  }

  const Plugin = requireServer(type, name)

  return {
    plugin: new Plugin({debug: pdebug, ...args}),
    pdebug
  }
}

function initOnce(plugin, pdebug) {
  // Make sure init() is called only once (if exists)
  if(!plugin.__initPromise) {
    plugin.__initPromise = plugin.init ? plugin.init :
      new Promise(resolve => resolve())
  }

  if(!plugin.__initPromise.then) {
    plugin.__initPromise = new Promise(resolve => resolve(plugin.init()))
  }

  return plugin.__initPromise.then((ret) => {
    if(ret) {
      pdebug(ret)
    }
    return plugin
  })
}

const plugins = {router}

/** Email send only service or server */
if(process.env.PLUGIN_EMAIL) {
  const name = process.env.PLUGIN_EMAIL
  const {plugin, pdebug} = newInstance('email', name)
  plugins.email = initOnce(plugin, pdebug)
}

/** Crypto payment provider.  Only a single processor is supported so far. */
if(process.env.PLUGIN_PAYMENT) {
  const name = process.env.PLUGIN_PAYMENT
  const {plugin, pdebug} = newInstance('payment', name, {syncEvents})
  if(plugin.webhook) {
    regWebhook('payment', name, plugin.webhook.bind(plugin), pdebug)
  }
  plugins.payment = initOnce(plugin, pdebug)
}

/** public hosted uploads, used for wallet logo */
if(process.env.PLUGIN_UPLOAD) {
  const name = process.env.PLUGIN_UPLOAD
  const {plugin, pdebug} = newInstance('upload', name)
  plugins.upload = initOnce(plugin, pdebug)
}

module.exports = plugins
