const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    wallet_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'LIMIT_REACHED'
    },
    destination: {
      type: DataTypes.STRING,
      defaultValue: 'slack'
    },
    status: {
      type: DataTypes.STRING,
    },
    params: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    created: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false
    },
  }, {
    tableName: 'notification'
  });

  Notification.associate = function (models) {
    Notification.belongsTo(models.Wallet, { foreignKey: 'wallet_id' })
  };

  return Notification;
};
