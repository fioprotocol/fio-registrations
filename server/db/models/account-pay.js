const Sequelize = require('sequelize')
const {Op} = Sequelize

module.exports = (sequelize, DataTypes) => {
  const AccountPay = sequelize.define('AccountPay', {
    pay_source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'coinbase, coinpayments, admin, etc.'
    },
    extern_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'If external, unique external payment processor ID'
    },
    forward_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Link to 3rd party payment page'
    },
    buy_price: {
      type: DataTypes.NUMERIC(9, 2),
      allowNull: true,
      comment: 'Price in USD / USDC'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '3rd party or plugin data'
    },
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    last_pay_event: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
    tableName: 'account_pay',
    // comment: '',
    indexes: [
      {
        unique: true,
        fields: ['pay_source', 'extern_id']
      }
    ]
  });

  AccountPay.associate = function(models) {
    AccountPay.belongsTo(models.Account, {foreignKey: 'account_id'});
    AccountPay.belongsTo(models.AccountPayEvent, {foreignKey: 'last_pay_event'})
    AccountPay.hasMany(models.AccountPayEvent, {foreignKey: 'account_pay_id'})
  };

  return AccountPay;
};
