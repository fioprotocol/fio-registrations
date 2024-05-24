/**
  Map Coinbase status (key) to show when a transaction is no longer pending.
  A pending status will get polled for updates.
*/
const pollingStatusMap = {
  // https://commerce.coinbase.com/docs/api/#charge-resource
  'NEW': true,
  'SIGNED': true,
  'PENDING': true,
  'MULTIPLE': true,
  'UNRESOLVED': true,
  'UNDERPAID': true,

  'REFUNDED': false,
  'COMPLETED': false,
  'EXPIRED' : false,
  'RESOLVED': false,
  'CANCELED' : false,
  'OVERPAID': false,
  'DELAYED': false,
  'MANUAL': false,
  'OTHER': false
}


module.exports = {
  pollingStatusMap
}
