'use strict';

module.exports = {
  up: async QI => {
   return await QI.changeColumn('registrations-search', 'owner_key', {
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async QI => {
    return QI.changeColumn('registrations-search', 'owner_key', {
      allowNull: false,
    });
  },
};
