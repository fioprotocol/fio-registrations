'use strict';
const Sequelize = require('sequelize')

module.exports = {
  up: async (QI, DT) => {
    await QI.addColumn('wallet', 'api_enabled', {
      type: DT.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Enable / disable secret API Bearer token'
    });
    return await QI.createTable('wallet-api', {
      wallet_id: {
        type: DT.INTEGER,
        allowNull: false,
        unique: true,
        primaryKey: true
      },
      api_bearer_hash: {
        type: DT.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'sha256 hash of the bearer token'
      },
      last_used: {
        type: Sequelize.DATE,
        allowNull: true
      },
    });
  },

  down: async QI => {
    await QI.removeColumn('wallet', 'api_enabled');
    return await QI.dropTable('wallet-api');
  },
};
