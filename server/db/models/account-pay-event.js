const Sequelize = require('sequelize')
const {Op} = Sequelize

module.exports = (sequelize, DataTypes) => {
  const AccountPayEvent = sequelize.define('AccountPayEvent', {
    created: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
      index: true
    },
    account_pay_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Unique ID assigned event id for a given payment'
    },
    pay_status: {
      type: DataTypes.STRING(15),
      allowNull: false,
      values: ['pending', 'success', 'review', 'cancel'],
      validate: {
        isIn: [['pending', 'success', 'review', 'cancel']]
      },
      comment: 'A "review" is a system or payment anomaly.  The admin moves from "review" to "success" or "cancel".'
    },
    pay_status_notes: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Details about the fail or review'
    },
    extern_status: {
      type: DataTypes.STRING(40),
      allowNull: true,
      comment: '3rd party',
    },
    extern_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '3rd party'
    },
    confirmed_total: {
      type: DataTypes.NUMERIC(9, 2),
      allowNull: true,
      comment: 'Running total processor payment USD / USDC'
    },
    pending_total: {
      type: DataTypes.NUMERIC(9, 2),
      allowNull: true,
      comment: 'Running total pending processor payment USD / USDC'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '3rd party or plugin data'
    },
    created_by: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Username if not a system event'
    },
    webhook_event_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    tableName: 'account_pay_event',
    // comment: '',
    indexes: [
      {
        fields: ['event_id', 'account_pay_id'],
        unique: true
      },
      {
        fields: ['pay_status']
      }
    ]
  });

  AccountPayEvent.associate = function(models) {
    AccountPayEvent.belongsTo(models.AccountPay, {foreignKey: 'account_pay_id'});
    AccountPayEvent.belongsTo(models.WebhookEvent, {foreignKey: 'webhook_event_id'})
  };

  return AccountPayEvent;
};
