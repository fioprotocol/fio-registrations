/**
  Map Coinbase status (key) to show when a transaction is no longer pending.
  A pending status will get polled for updates.
*/
const pendingStatusMap = {
  // https://commerce.coinbase.com/docs/api/#charge-resource
  'NEW': true,
  'PENDING': true,
  'MULTIPLE': true,
  'UNRESOLVED': true,

  'COMPLETED': false,
  'EXPIRED' : false,
  'RESOLVED': false,
  'CANCELED' : false,
  'UNDERPAID': false,
  'OVERPAID': false,
  'DELAYED': false,
  'MANUAL': false,
  'OTHER': false
}


module.exports = {
  pendingStatusMap
}
