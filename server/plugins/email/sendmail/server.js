
const sendmail = require('sendmail')()

if (!process.env.EMAIL_FROM) {
  throw new Error('Required: process.env.EMAIL_FROM');
}

class Sendmail {

  /** @arg {
    from: 'no-reply@yourdomain.com',
    to: 'test@qq.com, test@sohu.com, test@163.com ',
    subject: 'Test sendmail',
    html: 'HTML version',
    test: 'Text version'
  }
  */
  async send(message) {
    if(process.env.NODE_ENV !== 'production') {
      console.log(`EMAIL ${message.subject} (${JSON.stringify(message)}) [NODE_ENV !== 'production' not sent]`);
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
          resolve(reply)
        }
      })
      resolve()
    })
  }
}

module.exports = Sendmail
