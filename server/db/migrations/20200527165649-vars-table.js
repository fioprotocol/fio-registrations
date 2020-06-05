'use strict';
const Sequelize = require('sequelize')

module.exports = {
  up: async (QI, DT) => {
    return await QI.createTable('var', {
      id: { 
        type: DT.BIGINT,
        primaryKey: true, 
        autoIncrement: true 
      },
      key: {
        type: DT.STRING,
        allowNull: false,
        unique: true
      },
      value: {
        type: DT.STRING,
        allowNull: false,
        defaultValue: ''
      },
      updated_at: {
        type: DT.DATE,
        defaultValue: Sequelize.fn('now'),
        allowNull: false
      },
    });
  },

  down: async QI => {
    return await QI.dropTable('var');
  },
};
