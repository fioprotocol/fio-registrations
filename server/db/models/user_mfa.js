const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const UserMfa = sequelize.define('UserMfa', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    mfa_encrypted: {
      type: DataTypes.BLOB(160),
      allowNull: false,
      comment: 'Encrypted authenticator shared secret'
    },
    mfa_backup_codes: {
      type: DataTypes.BLOB(160),
      allowNull: false,
      comment: 'Encrypted one-time login codes (18 of them)'
    },
  }, {
    tableName: 'user_mfa'
  });

  UserMfa.associate = function(models) {
    UserMfa.belongsTo(models.User, {foreignKey: 'user_id', onDelete: 'CASCADE'});
  };

  return UserMfa;
};
