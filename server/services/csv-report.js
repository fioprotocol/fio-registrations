const path = require('path');
const fs = require('fs');
const converter = require('json-2-csv');

const db = require('../db/models');
const { Sequelize, sequelize } = db
const { getRegSearchRes } = require('../registrations-search-util')

const generateCsvReport = async (referralCode, domain, after) => {
  const accountWhere = {
    [Sequelize.Op.and]: [
      sequelize.literal(
        `("RegistrationsSearch".pay_status = 'success' AND "RegistrationsSearch".trx_status = 'success')`
      ),
      sequelize.literal(
        `referral_code = '${referralCode}'`
      ),
      {
        domain,
        address: { [Sequelize.Op.ne]: null },
        created: { [Sequelize.Op.gte]: after }
      }
    ]
  }
  const limit = 500
  let page = 1
  let finish = false
  const registrations = []

  while (!finish) {
    const offset = limit * (page - 1)
    const { rows, count } = await getRegSearchRes(accountWhere, {}, limit, offset)
    for (const row of rows) {
      registrations.push({
        ['FIO Address']: `${row.address}@${row.domain}`,
        ['Paid amount']: row.created,
        ['Date created']: row.buy_price === '0.00' && row.pay_source === 'free' ? 'free' : row.buy_price,
        ['Referral Code']: row.referral_code
      })
    }

    page++
    if (page > (Math.floor(count / limit) + 1)) {
      finish = true
    }
  }

  const csv = await converter.json2csvAsync(registrations);

  const fileId = new Date().toISOString();

  const uploadPath = path.resolve('public/uploads/')
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
  }

  const fileName = `csv-report-${domain}-from-${new Date(after).toJSON().split('T')[0]}-${hashName(fileId)}.csv`;
  const filePath = `${uploadPath}/${fileName}`;
  await fs.writeFileSync(filePath, csv);
  return fileName
}

const cleanCsvFiles = async () => {
  const uploadPath = path.resolve('public/uploads/')
  if (!fs.existsSync(uploadPath)) {
    return
  }
  try {
    fs.readdir(uploadPath, async (err, files) => {
      if (err) throw err;

      for (const file of files) {
        const { birthtime } = fs.statSync(path.join(uploadPath, file))
        const diff = diffHours(new Date(), birthtime)
        if (diff > 24) {
          fs.unlink(path.join(uploadPath, file), err => {
            if (err) throw err;
          });
        }
      }
    });
  } catch (e) {
    console.log(e);
  }
}

function diffHours(dt2, dt1) {
  let diff =(dt2.getTime() - dt1.getTime()) / 1000;
  diff /= (60 * 60);
  return Math.abs(Math.round(diff));
}

function hashName(string) {
  let hash = 0, i, chr;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

module.exports = {
  generateCsvReport,
  cleanCsvFiles
};
