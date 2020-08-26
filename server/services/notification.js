const https = require('https');
const db = require('../db/models');

async function processNotifications(wallet, accountsByDomains) {
  const notifications = []
  const walletRef = wallet.referral_code

  for (const { domain, accounts } of accountsByDomains) {
    const limit = parseInt(wallet.domains_limit[domain])
    if (limit - parseInt(accounts) <= 0) {
      notifications.push({ domain, reached: 0, limit })
      continue
    }
    if (limit - parseInt(accounts) < 10) {
      notifications.push({ domain, reached: 10, limit })
      continue
    }
    if (limit - parseInt(accounts) < 100) {
      notifications.push({ domain, reached: 100, limit })
    }
  }
  for (const notification of notifications) {
    // send notification
    const existedNotification = wallet.Notifications.find(
      n => n.params && n.params.domain && n.params.domain === notification.domain && n.params.reached === notification.reached && n.params.limit === notification.limit
    );

    if (!existedNotification) {
      const newNotification = await db.Notification.create({
        wallet_id: wallet.id,
        type: 'LIMIT_REACHED',
        destination: 'slack',
        status: 'inprogress',
        params: notification,
      })
      const messageBody = {
        'username': `${process.env.TITLE}`,
        'text': `Limit free address reached notifier. Free address registrations amount on ${walletRef} reached to ${notification.reached} for ${notification.domain} domain`,
        'icon_emoji': ':bangbang:',
        'attachments': [{
          'color': '#eed140',
          'fields': [
            {
              'title': 'Ref',
              'value': walletRef,
              'short': true
            },
            {
              'title': 'Amount left',
              'value': notification.reached,
              'short': true
            },
            {
              'title': 'Domain',
              'value': notification.domain,
              'short': true
            }
          ]
        }]
      }
      try {
        await sendSlackMessage(messageBody)
        newNotification.status = 'success'
        await newNotification.save()
      } catch (e) {
        console.log(e);
      }
    }
  }
}

function sendSlackMessage(messageBody) {
  try {
    messageBody = JSON.stringify(messageBody);
  } catch (e) {
    throw new Error('Failed to stringify messageBody', e);
  }

  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(process.env.SLACK_WEBHOOK_URL, requestOptions, (res) => {
      let response = '';

      res.on('data', (d) => {
        response += d;
      });

      res.on('end', () => {
        resolve(response);
      })
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(messageBody);
    req.end();
  });
}

module.exports = {
  processNotifications
};
