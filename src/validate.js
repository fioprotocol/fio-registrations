const addressRE = new RegExp(/^(?:(?=.{3,64}$)[a-zA-Z0-9]{1}(?:[a-zA-Z0-9-]*[a-zA-Z0-9]+){0,1}@[a-zA-Z0-9]{1}(?:[a-zA-Z0-9-]*[a-zA-Z0-9]+){0,1}$)/, 'i');
const fchRE = new RegExp(/^(?:(?=.{3,64}$)[a-zA-Z0-9]{1}(?:(?:(?!-{2,}))[a-zA-Z0-9-]*[a-zA-Z0-9]+){0,1}$)/, 'i');
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

  if (combinedLength > accountMaxLength)  {
    return false
  }

  return domain ? addressRE.test(address) : fchRE.test(account);
}

module.exports = {
  isValidAddress
}
