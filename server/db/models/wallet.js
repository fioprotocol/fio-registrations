module.exports = (sequelize, DataTypes) => {

  const Wallet = sequelize.define('Wallet', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'User friendly name'
    },
    referral_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'URL Lookup code for this wallet (all lowercase).'
    },
    logo_url: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '/images/logo.svg',
    },
    tpid: {
      type: DataTypes.STRING(127),
      allowNull: true,
      comment: 'username@domain Transaction processor ID (account that receives commission from fees)'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    domains: {
      type: DataTypes.ARRAY(DataTypes.STRING(62)),
      allowNull: false,
      defaultValue: []
    },
    domains_limit: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    allow_pub_domains: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    domain_sale_price: {
      type: DataTypes.NUMERIC(9, 2),
      allowNull: true,
      comment: 'Price in USD (or stable coin like USDC)'
    },
    account_sale_price: {
      type: DataTypes.NUMERIC(9, 2),
      allowNull: true,
      comment: 'Price in USD (or stable coin like USDC)'
    },
    domain_sale_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    account_sale_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    domain_roe_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    account_roe_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    webhook_endpoint: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL'
    },
    webhook_shared_secret: {
      type: DataTypes.BLOB(160),
      allowNull: true,
      comment: 'Encrypted webhook signing shared secret'
    },
    webhook_enabled: {
      type: DataTypes.DATE,
      allowNull: true
    },
    webhook_pay_events: {
      type: DataTypes.ARRAY(DataTypes.STRING(15)),
      allowNull: false,
      defaultValue: ['pending', 'success', 'review', 'cancel'],
      comment: 'enabled webhook events'
    },
    webhook_trx_events: {
      type: DataTypes.ARRAY(DataTypes.STRING(15)),
      allowNull: false,
      defaultValue: ['pending', 'retry', 'success', 'expire', 'review', 'cancel'],
      comment: 'enabled webhook events'
    },
    actor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    api_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Enable / disable secret API Bearer token'
    }
  }, {
    tableName: 'wallet'
  });

  Wallet.associate = function(models) {
    Wallet.hasMany(models.Account, {foreignKey: 'wallet_id'})
    Wallet.hasOne(models.WalletApi, { foreignKey: 'wallet_id', onDelete: 'CASCADE' })
  };

  return Wallet;
};
