'use strict';

module.exports = {
  up: async (QI, DT) => {
    return QI.addColumn('wallet', 'auto_bundles_add', {
      type: DT.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'When checked all addresses that have been registered by this profile using the registration site will have bundles added automatically if their bundle count drops below 5.'
    });
  },

  down: async QI => {
    return QI.removeColumn('wallet', 'auto_bundles_add');
  },
};
