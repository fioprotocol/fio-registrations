'use strict';
const Sequelize = require('sequelize')

module.exports = {
  up: async (QI, DT) => {
    await QI.createTable('registrations-search',
      {
        id: {
          type: DT.BIGINT,
          primaryKey: true,
          autoIncrement: true
        },
        account_id: {
          type: DT.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        owner_key: {
          type: DT.STRING,
          allowNull: false
        },
        address: {
          type: DT.STRING,
          allowNull: true,
          defaultValue: null
        },
        domain: {
          type: DT.STRING,
          allowNull: true,
          defaultValue: null
        },
        pay_status: {
          type: DT.STRING,
          allowNull: true,
          defaultValue: null
        },
        trx_status: {
          type: DT.STRING,
          allowNull: true,
          defaultValue: null
        },
        extern_id: {
          type: DT.STRING,
          allowNull: true,
          defaultValue: null
        },
        account_pay_id: {
          type: DT.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        account_pay_event_id: {
          type: DT.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        blockchain_trx_id: {
          type: DT.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        blockchain_trx_event_id: {
          type: DT.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        created: {
          type: DT.DATE,
          defaultValue: Sequelize.fn('now'),
          allowNull: false
        },
      }
    );
    await QI.addIndex(
      'registrations-search',
      ['account_id', 'pay_status', 'trx_status', 'account_pay_id', 'account_pay_event_id', 'blockchain_trx_id', 'blockchain_trx_event_id'],
      {
        fields: ['account_id', 'pay_status', 'trx_status', 'account_pay_id', 'account_pay_event_id', 'blockchain_trx_id', 'blockchain_trx_event_id'],
      }
    )
    return QI.addIndex(
      'registrations-search',
      ['account_id'],
      {
        unique: true,
        fields: ['account_id']
      }
    )
  },

  down: async QI => {
    return QI.dropTable('registrations-search');
  },
};
