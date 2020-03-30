const Sequelize = require('sequelize')
const {Op} = Sequelize

module.exports = (sequelize, DataTypes) => {
  const Account = sequelize.define('Account', {
    // uuid: {
    //   type: Sequelize.UUID,
    //   defaultValue: Sequelize.UUIDV4, //random
    //   allowNull: false,
    //   comment: 'Random UUIDV4, may be sent to 3rd parties'
    // },
    created: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false
    },
    domain: {
      type: DataTypes.STRING(62),
      allowNull: false,
      comment: 'Domain part of the blockchain account (after : separator)'
    },
    address: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Account part of the blockchain address (before : separator)'
    },
    owner_key: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Pending or existing blockchain public key'
    },
    wallet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
  }, {
    tableName: 'account',
    comment: 'Blockchain account or domain',
    indexes: [
      {
        unique: true,
        fields: ['address', 'domain', 'owner_key']
      },
      {
        unique: true,
        fields: ['domain', 'owner_key'],
        where: { address: {[Op.is]: null} }, // nullbuster
      },
      // {
      //   unique: true,
      //   fields: ['uuid']
      // },
      {
        fields: ['owner_key']
      }
    ]
  });

  Account.associate = function(models) {
    Account.belongsTo(models.Wallet, {foreignKey: 'wallet_id'})
    Account.hasMany(models.AccountPay, {foreignKey: 'account_id'})
    Account.hasMany(models.BlockchainTrx, {foreignKey: 'account_id'})
  };

  return Account;
};
