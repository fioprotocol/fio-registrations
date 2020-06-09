const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const WalletApi = sequelize.define('WalletApi', {
    wallet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      primaryKey: true
    },
    api_bearer_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'sha256 hash of the bearer token'
    },
    last_used: {
      type: Sequelize.DATE,
      allowNull: true
    },
  }, {
    tableName: 'wallet-api'
  });

  WalletApi.associate = function(models) {
    WalletApi.belongsTo(models.Wallet, { foreignKey: 'wallet_id', onDelete: 'CASCADE' });
  };

  return WalletApi;
};
