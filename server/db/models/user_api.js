const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const UserApi = sequelize.define('UserApi', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    api_bearer_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: 'sha256 hash of the bearer token'
    },
    last_used: {
      type: Sequelize.DATE,
      allowNull: true
    },
  }, {
    tableName: 'user_api'
  });

  UserApi.associate = function(models) {
    UserApi.belongsTo(models.User, {foreignKey: 'user_id', onDelete: 'CASCADE'});
  };

  return UserApi;
};
