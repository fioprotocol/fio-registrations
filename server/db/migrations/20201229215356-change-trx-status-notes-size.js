'use strict';

module.exports = {
  up: async (QI, DT) => {
    return QI.changeColumn(
      'blockchain_trx_event',
      'trx_status_notes',
      {
        type: DT.STRING(700),
        allowNull: true,
        comment: 'Error or message for review'
      }
    )
  },

  down: async (QI, DT) => {
    return QI.changeColumn(
      'blockchain_trx_event',
      'trx_status_notes',
      {
        type: DT.STRING(350),
        allowNull: true,
        comment: 'Error or message for review'
      }
    )
  },
};

