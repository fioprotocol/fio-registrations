'use strict';

module.exports = {
  up: async (QI, DT) => {
    await QI.addColumn('wallet', 'actor', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: ''
    });
    await QI.addColumn('wallet', 'permission', {
      type: DT.STRING,
      allowNull: false,
      defaultValue: ''
    });
    return await QI.addColumn('wallet', 'domains_limit', {
      type: DT.JSON,
      allowNull: true,
      defaultValue: {}
    });
  },

  down: async QI => {
    await QI.removeColumn('wallet', 'actor');
    await QI.removeColumn('wallet', 'permission');
    return await QI.removeColumn('wallet', 'domains_limit');
  },
};
