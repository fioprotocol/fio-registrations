const mailchimpProvider = require("@mailchimp/mailchimp_transactional");

if (!process.env.MAILCHIMP_API_KEY) {
  throw new Error("Required: process.env.MAILCHIMP_API_KEY");
}

const EMAIL_SENT_STATUS = "sent";

class Mailchimp {
  constructor({ debug }) {
    this.debug = debug;
    this.mailClient = mailchimpProvider(process.env.MAILCHIMP_API_KEY);
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
    if (message.from == null) {
      message.from = process.env.EMAIL_FROM;
    }

    const emails = message.to.split(",");

    const mailOptions = {
      message: {
        subject: message.subject,
        html: message.html,
        text: message.text,
        from_email: message.from,
        from_name: "",
        to: emails.map(email => ({
          email: email.trim()
        })),
        track_opens: false,
        track_clicks: false,
        auto_text: true,
        view_content_link: false
      }
    };

    try {
      const response = await this.mailClient.messages.send(mailOptions);

      if (response[0] == null) throw new Error("Email send error");
      if (response[0].status !== EMAIL_SENT_STATUS)
        throw new Error(JSON.stringify(response[0]));

      return response[0];
    } catch (err) {
      this.debug("error", JSON.stringify(err.message));
      try {
        this.debug("error", JSON.stringify(err.toJSON()));
      } catch (e) {
        //
      }
    }
  }
}

module.exports = Mailchimp;
