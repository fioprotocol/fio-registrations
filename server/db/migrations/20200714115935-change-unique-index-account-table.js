'use strict';
const Sequelize = require('sequelize')

module.exports = {
  up: async (QI) => {
    await QI.removeIndex(
      'account',
      ['address', 'domain', 'owner_key']
    )
    await QI.removeIndex(
      'account',
      ['domain', 'owner_key']
    )
    await QI.addIndex(
      'account',
      ['address', 'domain', 'owner_key', 'wallet_id'],
      {
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

  down: async QI => {
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
      ['address', 'domain', 'owner_key'],
      {
        fields: ['address', 'domain', 'owner_key'],
      }
    )
    return QI.addIndex(
      'account',
      ['domain', 'owner_key'],
      {
        unique: true,
        fields: ['domain', 'owner_key'],
        where: { address: { [Sequelize.Op.is]: null } },
      }
    )
  },
};
