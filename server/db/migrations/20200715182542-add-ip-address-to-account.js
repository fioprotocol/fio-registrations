'use strict';

module.exports = {
  up: async (QI, DT) => {
    return await QI.addColumn('account', 'ip', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: ''
    });
  },

  down: async QI => {
    return await QI.removeColumn('account', 'ip');
  },
};
