module.exports = [
  {
    symbol: 'bch',
    logo: '/images/coin/bch.svg',
    name: 'Bitcoin Cash',
    network: 'bitcoincash',
    qrdata: (addy, amt) => `bitcoincash:${addy}?amount=${amt}`
  },
  {
    symbol: 'eth',
    logo: '/images/coin/eth.svg',
    name: 'Ethereum',
    network: 'ethereum',
    qrdata: (addy, amt) => {
      // wei = eth * 10^18
      let [whole = '', dec = ''] = amt.split('.')
      dec = dec.substring(0, 18)
      const wei = whole + dec + '0'.repeat(18 - dec.length)
      let nz = 0
      while(wei.charAt(nz) === '0') nz++
      return `ethereum:${addy}?value=${wei.substring(nz)}`
    }
  },
  {
    symbol: 'ltc',
    logo: '/images/coin/ltc.svg',
    name: 'Litecoin',
    network: 'litecoin',
    qrdata: (addy, amt) => `litecoin:${addy}?amount=${amt}`
  },
  {
    symbol: 'btc',
    logo: '/images/coin/btc.svg',
    name: 'Bitcoin',
    network: 'bitcoin',
    qrdata: (addy, amt) => `bitcoin:${addy}?amount=${amt}`
  },
  {
    symbol: 'usdc',
    logo: '/images/coin/usdc.svg',
    name: 'USD Coin',
    network: 'usdc',
    qrdata: (addy) => `${addy}`
  }
]
