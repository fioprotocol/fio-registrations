require('dotenv').config({
  path: require('path').resolve(process.cwd(), '.env-server')
})
const { cleanCsvFiles } = require('./services/csv-report')


async function run() {
  await cleanCsvFiles()
}

module.exports = {
  run
}
