
const sendmail = require('sendmail')()

if (!process.env.EMAIL_FROM) {
  throw new Error('Required: process.env.EMAIL_FROM');
}

class Sendmail {
  constructor({debug}) {
    this.debug = debug
  }

  /** @arg {
    from: 'no-reply@yourdomain.com',
    to: 'test@qq.com, test@sohu.com, test@163.com ',
    subject: 'Test sendmail',
    html: 'HTML version',
    text: 'Text version'
  }
  */
  async send(message) {
    this.debug('Waring: re-enable production check "Don\'t log in production, that compromises password links"')
      this.debug(JSON.stringify(message))

    if(process.env.NODE_ENV !== 'production') {
      return
    }

    if(message.from == null) {
      message.from = process.env.EMAIL_FROM
    }

    return new Promise(function(resolve, reject) {
      sendmail(message, function(err, reply) {
        if(err) {
          console.error(`sendmail error ${err} reply ${reply} message ${JSON.stringify(message)}`);
          reject(err)
        } else {
          resolve(reply) // ok to resolve twice
        }
      })
      // sendmail can be very slow, this frees up the caller
      resolve()
    })
  }
}

module.exports = Sendmail
