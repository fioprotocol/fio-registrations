const ACCOUNT_TYPES = {
  register: 'register',
  renew: 'renew',
  // todo: fix db rules before setting custom value or create separate table for ACCOUNT_TYPES (with enum ids)
  addBundles: 'renew'
}

module.exports = {
  ACCOUNT_TYPES,
};
