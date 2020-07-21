const JsonFetch = require('../src/api/json-fetch');
const db = require('./db/models');

const roeEndpoint = 'https://bitmax.io/api/pro/v1/'
const requestRoe = JsonFetch(roeEndpoint, {})
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
      const { data: { data } } = await requestRoe.get('trades?symbol=FIO/USDT')
      if (data.length) {
        let sum = 0
        for (const tradeItem of data){
          sum += parseFloat(tradeItem.p)
        }
        const avgPrice = sum / data.length
        roe.value = avgPrice
        roe.updated_at = now
        await roe.save()
        return avgPrice
      }
    } catch (e) {
      console.log('ROE UPDATE ERROR ===');
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
