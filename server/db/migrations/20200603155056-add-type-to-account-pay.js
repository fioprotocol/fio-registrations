'use strict';

module.exports = {
  up: async (QI, DT) => {
    return await QI.addColumn('account_pay', 'type', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: 'register'
    });
  },

  down: async QI => {
    return await QI.removeColumn('account_pay', 'type');
  },
};
