'use strict';

module.exports = {
  up: async (QI, DT) => {
    await QI.addColumn('wallet', 'account_roe_active', {
      type: DT.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    return await QI.addColumn('wallet', 'domain_roe_active', {
      type: DT.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async QI => {
    await QI.removeColumn('wallet', 'account_roe_active');
    return await QI.removeColumn('wallet', 'domain_roe_active');
  },
};
