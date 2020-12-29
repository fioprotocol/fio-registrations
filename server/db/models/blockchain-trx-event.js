const Sequelize = require('sequelize')
const {Op} = Sequelize

module.exports = (sequelize, DataTypes) => {
  const BlockchainTrxEvent = sequelize.define('BlockchainTrxEvent', {
    created: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
      index: true
    },
    trx_status: {
      type: DataTypes.STRING(15),
      allowNull: false,
      values: ['pending', 'retry', 'success', 'expire', 'review', 'cancel'],
      validate: {
        isIn: [['pending', 'retry', 'success', 'expire', 'review', 'cancel']]
      },
      comment: 'A "review" is an unexpected system or broadcast exception.  An "expire" will resend several times and move to "success" or "review".  The admin will "review" then "retry" or "cancel".'
    },
    trx_status_notes: {
      type: DataTypes.STRING(700),
      allowNull: true,
      comment: 'Error or message for review'
    },
    created_by: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Username if not a system event'
    },
    blockchain_trx_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Database join, not the blockchain transaction id'
    },
    webhook_event_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    tableName: 'blockchain_trx_event',
    // comment: '',
    indexes: [
      {
        fields: ['trx_status']
      }
    ]
  });

  BlockchainTrxEvent.associate = function(models) {
    BlockchainTrxEvent.belongsTo(models.BlockchainTrx, {foreignKey: 'blockchain_trx_id'});
    BlockchainTrxEvent.belongsTo(models.WebhookEvent, {foreignKey: 'webhook_event_id'})
  };

  return BlockchainTrxEvent;
};
