const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    created: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false
    },
    last_login: {
      type: Sequelize.DATE,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'Null when inviting a new user'
    },
    invite_by: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
      unique: true
    },
    password: {
      type: DataTypes.BLOB(160),
      allowNull: true,
      comment: 'Encrypted bcrypt'
    },
    email_password: {
      type: DataTypes.BLOB(160),
      allowNull: true,
      comment: 'Encrypted bcrypt, only 256 bit passwords go here'
    },
    force_password_change: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    mfa_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    api_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Enable / disable secret API Bearer token'
    },
  }, {
    tableName: 'user'
  });

  User.associate = function(models) {
    User.hasOne(models.UserMfa, {foreignKey: 'user_id', onDelete: 'CASCADE'});
    User.hasOne(models.UserApi, {foreignKey: 'user_id', onDelete: 'CASCADE'});
  };

  return User;
};
