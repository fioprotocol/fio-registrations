
const accountRe = /^[a-z0-9-]{1,62}$/
const accountMaxLength = 64

/**
  @arg address {string} 'account' or 'account@domain'
  @return {boolean}
*/
function isValidAddress(address) {
  const [account, domain] = address.split('@')

  const combinedLength = domain !== undefined ?
    account.length + domain.length + 1 :
    account.length

  if(combinedLength > accountMaxLength)  {
    return false
  }

  const dashSplit = account.split('-')
  if(dashSplit.find(part => part === '') === '') {
    return false // two dashes in a row
    // also covers: a-z0-9 is required on either side of any dash
  }

  return accountRe.test(account) && (
    domain === undefined || isValidAddress(domain)
  )
}

module.exports = {
  isValidAddress
}
