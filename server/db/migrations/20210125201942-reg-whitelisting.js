'use strict';

module.exports = {
  up: (QI, DT) => {
    return QI.addColumn('wallet', 'limit_ip_whitelist', {
      type: DT.TEXT,
      allowNull: true,
      defaultValue: '',
      comment: 'Disables limit registrations of free addresses for these IP addresses'
    });
  },

  down: QI => {
    return QI.removeColumn('wallet', 'limit_ip_whitelist');
  },
};
