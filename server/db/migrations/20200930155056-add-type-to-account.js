'use strict';
const Sequelize = require('sequelize')

module.exports = {
  up: async (QI, DT) => {
    await QI.addColumn('registrations-search', 'account_type', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: 'register'
    });
    await QI.addColumn('account', 'type', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: 'register'
    });

    await QI.removeIndex(
      'account',
      ['address', 'domain', 'owner_key', 'wallet_id'],
    )
    await QI.removeIndex(
      'account',
      ['domain', 'owner_key', 'wallet_id'],
    )
    await QI.addIndex(
      'account',
      ['address', 'domain', 'owner_key', 'wallet_id'],
      {
        unique: true,
        fields: ['address', 'domain', 'owner_key', 'wallet_id'],
        where: { type: 'register' },
      }
    )
    return QI.addIndex(
      'account',
      ['domain', 'owner_key', 'wallet_id'],
      {
        unique: true,
        fields: ['domain', 'owner_key', 'wallet_id'],
        where: { address: { [Sequelize.Op.is]: null }, type: 'register' },
      }
    )
  },

  down: async QI => {
    await QI.removeColumn('registrations-search', 'account_type');
    await QI.removeColumn('account', 'type');

    await QI.removeIndex(
      'account',
      ['address', 'domain', 'owner_key', 'wallet_id'],
    )
    await QI.removeIndex(
      'account',
      ['domain', 'owner_key', 'wallet_id'],
    )
    await QI.addIndex(
      'account',
      ['address', 'domain', 'owner_key', 'wallet_id'],
      {
        unique: true,
        fields: ['address', 'domain', 'owner_key', 'wallet_id'],
      }
    )
    return QI.addIndex(
      'account',
      ['domain', 'owner_key', 'wallet_id'],
      {
        unique: true,
        fields: ['domain', 'owner_key', 'wallet_id'],
        where: { address: { [Sequelize.Op.is]: null } },
      }
    )
  },
};
