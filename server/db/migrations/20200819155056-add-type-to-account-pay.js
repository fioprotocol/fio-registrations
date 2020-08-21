'use strict';

module.exports = {
  up: async (QI, DT) => {
    await QI.addColumn('registrations-search', 'ap_type', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: 'register'
    });
    await QI.removeIndex(
      'registrations-search',
      ['account_id']
    )
    await QI.addIndex(
      'registrations-search',
      ['account_id', 'ap_type'],
      {
        unique: true,
        fields: ['account_id', 'ap_type'],
      }
    )
    return await QI.addColumn('account_pay', 'type', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: 'register'
    });
  },

  down: async QI => {
    await QI.removeIndex(
      'registrations-search',
      ['account_id', 'ap_type']
    )
    await QI.addIndex(
      'registrations-search',
      ['account_id'],
      {
        unique: true,
        fields: ['account_id'],
      }
    )
    await QI.removeColumn('registrations-search', 'ap_type');
    return await QI.removeColumn('account_pay', 'type');
  },
};
