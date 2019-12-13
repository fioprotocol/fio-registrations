const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const BlockchainTrx = sequelize.define('BlockchainTrx', {
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      values: ['register'], //, 'renew'
      validate: {
        isIn: [['register']] //, 'renew'
      },
      comment: 'Primary reason for this transaction'
    },
    trx_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blockchain transaction ID'
    },
    expiration: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Blockchain transaction expiration'
    },
    block_num: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Block for this transaction'
    },
    block_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Block time for this transaction, used to determine irreversibility'
    },
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'blockchain_trx',
    comment: 'Record is created before broadcast then selected with read lock during broadcast.',
    indexes: [
      {
        fields: ['trx_id'],
        unique: true
      }
    ]
  });

  BlockchainTrx.associate = function(models) {
    BlockchainTrx.belongsTo(models.Account, {foreignKey: 'account_id'});
    BlockchainTrx.hasMany(models.BlockchainTrxEvent, {foreignKey: 'blockchain_trx_id'})
  };

  return BlockchainTrx;
};
