const JsonFetch = require('../src/api/json-fetch');
const db = require('./db/models');

const binanceEndpoint = 'https://api.binance.com/api/v3/'
const requestBinance = JsonFetch(binanceEndpoint, {})
const roeKey = 'roe'
const minToUpdate = 15

const getROE = async () => {
  const now = new Date()
  
  let roe = await db.Var.findOne({
    where: {
      key: roeKey
    }
  })
  if (!roe) {
    roe = await db.Var.create({ key: roeKey, value: '', updated_at: now })
  }
  const diffMins = Math.round((((now - roe.updated_at) % 86400000) % 3600000) / 60000)
  if (diffMins > minToUpdate || !roe.value) {
    try {
      const res = await requestBinance.get('avgPrice?symbol=ADAUSDT')
      if (res.price) {
        roe.value = res.price
        roe.updated_at = now
        await roe.save()
        return res.price
      }
    } catch (e) {
      console.log(e);
      return roe.value
    }
  }
  
  return roe.value
}

const convert = (fioAmount, roeValue) => {
  const SUF = 1000000000
  return Math.round(fioAmount / (SUF / 100) * roeValue) / 100
}

module.exports = {
  getROE,
  convert
};
