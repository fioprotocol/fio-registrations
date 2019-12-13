const Sequelize = require('sequelize')
const {Op} = Sequelize

module.exports = (sequelize, DataTypes) => {

  const WebhookEvent = sequelize.define('WebhookEvent', {
    attempt: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    next_attempt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    response_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Keep re-trying until a successful status code 2xx or max retries',
    },
    message: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
  }, {
    tableName: 'webhook_event',
    indexes: [
      {
        fields: ['response_status'],
        where: {
          response_status: {
            [Op.and]: { [Op.lt]: 200, [Op.gte]: 300, }
          }
        }
      }
    ]
  });

  return WebhookEvent;
};
