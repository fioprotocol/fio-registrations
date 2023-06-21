'use strict';

module.exports = {
  up: async (QI, DT) => {
    await QI.changeColumn('registrations-search', 'owner_key', {
      type: DT.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (QI, DT) => {
    return QI.changeColumn('registrations-search', 'owner_key', {
      type: DT.STRING,
      allowNull: false,
    });
  },
};
