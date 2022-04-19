const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const AccountProfile = sequelize.define('AccountProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    actor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  }, {
    tableName: 'account_profile',
    paranoid: true,
    timestamps: true,
    underscored: true,
  });

  AccountProfile.associate = function(models) {
    AccountProfile.hasMany(models.Wallet, { as: 'accountProfile', foreignKey: 'account_profile_id'})
  };

  return AccountProfile;
};
