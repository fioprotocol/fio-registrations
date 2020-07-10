const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const RegistrationsSearch = sequelize.define('RegistrationsSearch', {
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    owner_key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    pay_status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    trx_status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    extern_id: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    account_pay_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    account_pay_event_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    blockchain_trx_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    blockchain_trx_event_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    created: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false
    }
  }, {
    tableName: 'registrations-search',
    comment: 'Data to search for admin',
    indexes: [
      {
        unique: true,
        fields: ['account_id']
      },
      {
        fields: ['account_id', 'pay_status', 'trx_status', 'account_pay_id', 'account_pay_event_id', 'blockchain_trx_id', 'blockchain_trx_event_id']
      }
    ]
  });

  RegistrationsSearch.associate = function (models) {
    RegistrationsSearch.belongsTo(models.Account, { foreignKey: 'account_id' })
    RegistrationsSearch.belongsTo(models.AccountPay, { foreignKey: 'account_pay_id' })
    RegistrationsSearch.belongsTo(models.AccountPayEvent, { foreignKey: 'account_pay_event_id' })
    RegistrationsSearch.belongsTo(models.BlockchainTrx, { foreignKey: 'blockchain_trx_id' })
    RegistrationsSearch.belongsTo(models.BlockchainTrxEvent, { foreignKey: 'blockchain_trx_event_id' })
  };

  return RegistrationsSearch;
};
