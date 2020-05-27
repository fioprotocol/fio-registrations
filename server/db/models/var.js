const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {

  const Var = sequelize.define('Var', {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false
    },
  }, {
    tableName: 'var'
  });

  return Var;
};
