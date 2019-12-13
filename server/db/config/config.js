const logBind = require('debug')('sequelize:sql:bind')

// Seeding needs contfig
require('dotenv').config({
  path: require('path').resolve(process.cwd(), '.env-server')
});

const productionEnv = {
  use_env_variable: "DATABASE_URL",
  seederStorage: "sequelize",
  seederStorageTableName: "SequelizeSeeder",
  logging: false,
  define: {
    freezeTableName: true,
    timestamps: false,
    underscored: true, // helps avoid quoting requirements in raw sql
  },
  // pool: {
  //   max: 5,
  //   min: 0,
  //   acquire: 30000,
  //   idle: 11000
  // }
}

const production = JSON.parse(JSON.stringify(productionEnv))
const development = JSON.parse(JSON.stringify(productionEnv))
const test = JSON.parse(JSON.stringify(productionEnv))

development.logging = customLogger

module.exports = {
  production,
  development,
  test
}

function customLogger ( queryString, queryObject ) {
  if(queryObject.bind) {
    logBind(queryObject.bind)
    // console.log(queryString, queryObject.bind)
  } else {
    // console.log(queryString)
  }
}
