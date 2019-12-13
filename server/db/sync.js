const {sequelize} = require('./models')

module.exports = sequelize.sync()
