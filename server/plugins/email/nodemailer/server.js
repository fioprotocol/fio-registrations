
const nodemailer = require('nodemailer')

if (!process.env.EMAIL_FROM) {
  throw new Error('Required: process.env.EMAIL_FROM');
}

if (
  (!process.env.NODEMAILER_URL && !process.env.NODEMAILER_OPTIONS) ||
  (process.env.NODEMAILER_URL && process.env.NODEMAILER_OPTIONS)
) {
  throw new Error('Required: process.env.NODEMAILER_URL or process.env.NODEMAILER_OPTIONS');
}

class NodeMailer {
  constructor({debug}) {
    this.debug = debug
    if(process.env.NODEMAILER_URL) {
      this.transporter = nodemailer.createTransport(
        process.env.NODEMAILER_URL
      )
    }
    if(process.env.NODEMAILER_OPTIONS) {
      const options = JSON.parse(process.env.NODEMAILER_OPTIONS)
      this.transporter = nodemailer.createTransport(options)
    }
  }

  async init() {
    const verifyConfiguration = await this.transporter.verify()
    if(!verifyConfiguration) {
      console.error('NODEMAILER could not verify your configuration')
    }
    return {verifyConfiguration}
  }

  /** @arg {
    from: 'no-reply@yourdomain.com',
    to: 'test@qq.com, test@sohu.com, test@163.com ',
    subject: 'Test SmtpServer',
    html: 'HTML version',
    test: 'Text version'
  }
    @see https://nodemailer.com/message/
  */
  async send(message) {
    if(message.from == null) {
      message.from = process.env.EMAIL_FROM
    }

    this.debug('Waring: re-enable production check "Don\'t log in production, that compromises password links"')
    // if(process.env.NODE_ENV !== 'production') {
      // Don't log in production, that compromises password links
      this.debug(JSON.stringify(message))
    // }

    const result = await this.transporter.sendMail(message)
    return result
  }
}

module.exports = NodeMailer
