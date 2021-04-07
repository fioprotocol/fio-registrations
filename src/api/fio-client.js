const crypto = require('crypto')
const JsonFetch = require('./json-fetch')

class FioClient {
  /*{
    chainEndpoint: string|function<async>,
    options: {
      expireIn: number,
      privateKeys: array<string>,
      authorization: {
        actor: string,
        permission: string
      }
    }
  }*/
  constructor(chainEndpoint, options = {}) {
    this.options = options
    const {logging} = options

    if(typeof chainEndpoint === 'function') {
      this.init = new Promise(async (resolve) => {
        const endpoint = await chainEndpoint()
        this.chain = JsonFetch(endpoint, {logging})
        resolve()
      })
    } else {
      this.chain = JsonFetch(chainEndpoint, {logging})
      this.init = new Promise(resolve => resolve())
    }
  }

  // https://developers.fioprotocol.io/api/API-spec
  /**
    @arg {Account} address@domain
    @return {boolean}
  */
  async isAccountRegistered(address) {
    await this.init
    address = address.replace(/:/, '@')
    const isAddress = address.indexOf('@') > 0

    const hash = crypto.createHash('sha1')
    const bound = '0x' + hash.update(address).digest().slice(0,16).reverse().toString("hex")
    const result = await this.chain.post('/get_table_rows', {
      code: 'fio.address',
      scope: 'fio.address',
      table: isAddress ? 'fionames' : 'domains',
      lower_bound: bound,
      upper_bound: bound,
      key_type: 'i128',
      index_position: isAddress ? '5' : '4',
      json: true
    })

    if (result.rows && result.rows.length) {
      return !!result.rows[0].id
    }
    return false
  }
  async isAccountNotAvailable(address) {
    await this.init
    address = address.replace(/:/, '@')
    const check = await this.chain.post('/avail_check', {fio_name: address})
    if (typeof check.is_registered === 'number') {
      return check.is_registered === 1
    }
    throw new Error(JSON.stringify(check))
  }

  async isAccountCouldBeRenewed(address) {
    await this.init
    address = address.replace(/:/, '@')
    const isAddress = address.indexOf('@') > 0

    const hash = crypto.createHash('sha1')
    const bound = '0x' + hash.update(address).digest().slice(0,16).reverse().toString("hex")
    const result = await this.chain.post('/get_table_rows', {
      code: 'fio.address',
      scope: 'fio.address',
      table: isAddress ? 'fionames' : 'domains',
      lower_bound: bound,
      upper_bound: bound,
      key_type: 'i128',
      index_position: isAddress ? '5' : '4',
      json: true
    })

    if (result.rows && result.rows.length) {
      return !!result.rows[0].id
    }
    return false
  }

  async isDomainPublic(domain) {
    await this.init
    const hash = crypto.createHash('sha1')
    const bound = '0x' + hash.update(domain).digest().slice(0,16).reverse().toString("hex")
    const result = await this.chain.post('/get_table_rows', {
      code: 'fio.address',
      scope: 'fio.address',
      table: 'domains',
      lower_bound: bound,
      upper_bound: bound,
      key_type: 'i128',
      index_position: '4',
      json: true
    })
    if (result.rows && result.rows.length) {
      return !!result.rows[0].is_public
    }
    return false
  }

  getFeeAddress = async (fio_address) => {
    await this.init
    return this.getFee(
      'register_fio_address', fio_address.replace(/:/, '@')
    )
  }

  getFeeDomain = async (fio_address) => {
    await this.init
    return this.getFee(
      'register_fio_domain', fio_address.replace(/:/, '@')
    )
  }

  getFeeRenewAddress = async (fio_address) => {
    await this.init
    return this.getFee(
      'renew_fio_address', fio_address.replace(/:/, '@')
    )
  }

  getFeeRenewDomain = async (fio_address) => {
    await this.init
    return this.getFee(
      'renew_fio_domain', fio_address.replace(/:/, '@')
    )
  }

  async getFee(end_point, fio_address = null) {
    await this.init
    const ret = await this.chain.post('/get_fee', {
      fio_address: fio_address.replace(/:/, '@'),
      end_point
    })
    return ret.fee
  }

  async getBalance(publicKey) {
    await this.init
    const ret = await this.chain.post('/get_fio_balance', {fio_public_key: publicKey})
    return ret.balance
  }

  async getNames(publicKey) {
    await this.init
    const names = await this.chain.post('/get_fio_names', {fio_public_key: publicKey})
    if(names.fio_domains && names.fio_addresses) {
      return names
    }
    // { message: 'No FIO names' }
    return []
  }

  async getAddress(fio_address, token = 'FIO') {
    await this.init
    const ret = await this.chain.post('/get_pub_address', {
      fio_address: fio_address.replace(/:/, '@'),
      chain_code: token,
      token_code: token
    })
    return ret.public_address
  }

  async getPubAddressByDomain(domain) {
    await this.init
    const hash = crypto.createHash('sha1')
    const bound = '0x' + hash.update(domain).digest().slice(0,16).reverse().toString("hex")
    const result = await this.chain.post('/get_table_rows', {
      code: 'fio.address',
      scope: 'fio.address',
      table: 'domains',
      lower_bound: bound,
      upper_bound: bound,
      key_type: 'i128',
      index_position: '4',
      json: true
    })
    if (result.rows && result.rows.length) {
      const account = result.rows[0].account
      if (account) {
        const accountData = await this.chain.post('/get_table_rows', {
          code: 'fio.address',
          scope: 'fio.address',
          table: 'accountmap',
          lower_bound: account,
          upper_bound: account,
          key_type: 'name',
          index_position: '1',
          json: true
        })

        if (accountData.rows && accountData.rows.length) {
          return accountData.rows[0].clientkey
        }
      }
    }
    return ''
  }
}

module.exports = FioClient
