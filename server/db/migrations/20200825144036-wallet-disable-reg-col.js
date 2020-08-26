'use strict';

module.exports = {
  up: async (QI, DT) => {
    return QI.addColumn('wallet', 'disable_reg', {
      type: DT.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Enable / disable registration using site'
    });
  },

  down: async QI => {
    return QI.removeColumn('wallet', 'disable_reg');
  },
};
