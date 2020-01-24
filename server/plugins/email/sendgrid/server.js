
const sgMail = require('@sendgrid/mail')

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('Required: process.env.SENDGRID_API_KEY');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

class Sendgrid {
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

    if(message.from == null) {
      message.from = process.env.EMAIL_FROM
    }

    await sgMail.send(message)
  }
}

module.exports = Sendgrid
