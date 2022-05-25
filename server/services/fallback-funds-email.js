const db = require('../db/models');
const plugins = require('../plugins');

const DEFAULT_EMAIL_DATA = {
  to: process.env.REG_FALLBACK_NOTIFICATION_EMAIL,
  subject: 'Reg Site insufficient funds',
}

const lastNotificationKey = 'lastInsufficientFundsNotificationSent'
const TIMEOUT_HOURS = 1000 * 60 * 60 * 24 // 24 hours

const sendInsufficientFundsNotification = async (fioName, walletProfileName, authorization) => {
  const now = new Date()

  let lastNotification = await db.Var.findOne({
    where: {
      key: lastNotificationKey
    }
  })
  if (!lastNotification) {
    lastNotification = await db.Var.create({ key: lastNotificationKey, value: now.getTime() - 1000 * 60 * 60 * 25 })
  }
  const diffHours = now.getTime() - lastNotification.value
  if (diffHours > TIMEOUT_HOURS) {
    try {
      const sendmail = await plugins.email

      await sendmail.send({
        ...DEFAULT_EMAIL_DATA,
        html: `
<p>Registration site got insufficient funds error when registering <b>${fioName}</b> on profile <b>${walletProfileName}</b> using account <i>${authorization.actor}</i> and permission <i>${authorization.permission}</i>.</p>
<p>You will receive this email once every 24 hrs or until issue is resolved.</p>`,
        text: `Registration site got insufficient funds error when registering ${fioName} on profile ${walletProfileName} using account ${authorization.actor} and permission ${authorization.permission}. You will receive this email once every 24 hrs or until issue is resolved.`
      })
    } catch (e) {
      console.log('InsufficientFundsNotification send ERROR ===');
      console.log(e);
    }

    try {
      lastNotification.value = now.getTime()
      await lastNotification.save()
    } catch (e) {
      console.log('Last date var for InsufficientFundsNotification set ERROR ===');
      console.log(e);
    }
  }
}

module.exports = {
  sendInsufficientFundsNotification,
};
