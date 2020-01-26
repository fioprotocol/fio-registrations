const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const AccountAdj = sequelize.define('AccountAdj', {
    created: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
      index: true
    },
    created_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Username'
    },
    owner_key: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Blockchain owner public key'
    },
    amount: {
      type: DataTypes.NUMERIC(9, 2),
      allowNull: true,
      comment: 'Adjustment amount (positive or negative) USD / USDC'
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'User-entered data'
    },
  }, {
    tableName: 'account_adj',
    comment: 'Adjustments to an account balance.',
    indexes: [{
      fields: ['owner_key']
    }]
  });

  return AccountAdj;
};
