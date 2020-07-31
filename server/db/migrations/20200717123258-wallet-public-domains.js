'use strict';

module.exports = {
  up: async (QI, DT) => {
    return QI.addColumn('wallet', 'allow_pub_domains', {
      type: DT.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async QI => {
    return QI.removeColumn('wallet', 'allow_pub_domains');
  },
};
