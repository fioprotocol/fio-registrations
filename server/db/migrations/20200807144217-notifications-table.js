'use strict';
const Sequelize = require('sequelize')

module.exports = {
  up: (QI, DT) => {
    return QI.createTable('notification',
      {
        id: {
          type: DT.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        wallet_id: {
          type: DT.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        type: {
          type: DT.STRING,
          defaultValue: 'LIMIT_REACHED'
        },
        destination: {
          type: DT.STRING,
          defaultValue: 'slack'
        },
        status: {
          type: DT.STRING,
        },
        params: {
          type: DT.JSON,
          allowNull: true,
          defaultValue: {}
        },
        created: {
          type: DT.DATE,
          defaultValue: Sequelize.fn('now'),
          allowNull: false
        },
      }
    );
  },

  down: async QI => {
    return QI.dropTable('notification');
  },
};
