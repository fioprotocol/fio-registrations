const debug = require('debug')('fio:fio-api')

const FioClient = require('../../src/api/fio-client')

const { Fio, Ecc } = require('@fioprotocol/fiojs');
const { TextEncoder, TextDecoder } = require('text-encoding');
const { base64ToBinary } = require('@fioprotocol/fiojs/dist/chain-numeric')
const { Api } = require('@fioprotocol/fiojs/dist/chain-api')
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

class FioApi extends FioClient {

  /**
    @arg {boolean} options.broadcast - false allows access to the transaction ID before broadcast

    @arg {string} chainEndpoint - url (no trailing slash)
    @arg {object} options
    @arg {number} options.expireIn
    @arg {array}  options.privateKeys: array<string>
    @arg {string} options.chainId: string
    @arg {boolean} options.broadcast: boolean
    @arg {object} options.authorization
    @arg {string} options.authorization.actor
    @arg {string} options.authorization.permission
  */
  constructor(chainEndpoint, options = {}) {
    super(chainEndpoint, options)
    this.options = options

    if(!this.options.expireIn) {
      this.options.expireIn = 60 // seconds, no longer than needed
    }

    if(this.options.broadcast === undefined) {
      this.options.broadcast = true
    }

    this.abiMap = new Map()
  }

  async getInfo() {
    return this.chain.post('/get_info')
  }

  async getBlock(blockNumOrId) {
    return this.chain.post('/get_block', {block_num_or_id: blockNumOrId})
  }

  registerDomain({domain, ownerPublic, maxFee, tpid, actor}, options = {}) {
    return {
      account: 'fio.address',
      name: 'regdomain',
      authorization: options.authorization || this.options.authorization,
      data: {
        fio_domain: domain,
        owner_fio_public_key: ownerPublic,
        max_fee: maxFee,
        tpid,
        actor: options.actor || actor
      }
    }
  }

  registerAddress({address, ownerPublic, maxFee, tpid, actor}, options = {}) {
    return {
      account: 'fio.address',
      name: 'regaddress',
      authorization: options.authorization || this.options.authorization,
      data: {
        fio_address: address,
        owner_fio_public_key: ownerPublic,
        max_fee: maxFee,
        tpid,
        actor: options.actor || actor
      }
    }
  }

  renewDomain({domain, ownerPublic, maxFee, tpid, actor}, options = {}) {
    // todo:
    return {}
  }

  renewAddress({address, ownerPublic, maxFee, tpid, actor}, options = {}) {
    // todo:
    return {}
  }

  async transaction(actions = [], {
    privateKeys = null
  } = {}) {
    const {expireIn} = this.options
    const info = await this.chain.get('/get_info')

    if(this.options.chainId) {
      if(this.options.chainId !== info.chain_id) {
        throw new Error(`Configured chain_id ${this.options.chainId} does not match blockchain: ${info.chain_id}`)
      }
    } else {
      debug(`WARNING: Accepted unverified CHAIN_ID ${info.chain_id}`)
      this.options.chainId = info.chain_id
    }

    const blockInfo = await this.chain.post('/get_block', {block_num_or_id: info.last_irreversible_block_num})

    const blockTime = new Date(`${info.head_block_time}Z`)
    const expireInISO = new Date(blockTime.getTime() + (expireIn * 1000)).toISOString();
    const expiration = expireInISO.substr(0, expireInISO.length - 1); // remove `Z`

    const transaction = {
      expiration,
      ref_block_num: blockInfo.block_num & 0xffff,
      ref_block_prefix: blockInfo.ref_block_prefix,
      actions
    }

    if(!this.options.broadcast) {
      return transaction
    }

    return this.broadcast(transaction, {privateKeys})
  }

  async transactionId(transaction) {
    const {chainId} = this.options

    await this.abiActions(transaction.actions)

    const abiProvider = {
      getRawAbi: async (accountName) => {
        const rawAbi = this.abiMap.get(accountName);
        if(!rawAbi) {
          throw new Error(`Missing ABI for account ${accountName}`);
        }

        const abi = base64ToBinary(rawAbi.abi);
        const binaryAbi = { accountName: rawAbi.account_name, abi };
        return binaryAbi;
      }
    };

    const api = new Api({
      //signatureProvider, authorityProvider,
      abiProvider, chainId, textDecoder, textEncoder
    })

    const serTransaction = {
      ...transaction,
      context_free_actions: await api.serializeActions(transaction.context_free_actions || []),
      actions: await api.serializeActions(transaction.actions)
    };
    const serializedTransaction = api.serializeTransaction(serTransaction)
    const trxId = Ecc.sha256(serializedTransaction).toString('hex')
    return trxId
  }

  async broadcast(transaction, {
    url = '/push_transaction',
    privateKeys = null
  } = {}) {
    if(!transaction.signatures) {
      transaction = await this.prepareTransaction(
        transaction,
        {privateKeys}
      )
    }
    const trx = await this.chain.post(url, transaction)
    if (trx.processed && trx.processed.except) {
      throw new Error(trx)
    }
    return trx
  }

  async prepareTransaction(transaction, {privateKeys}) {
    if(this.options.logging) {
      this.options.logging(transaction)
    }

    await this.abiActions(transaction.actions)

    return await Fio.prepareTransaction({
      transaction,
      chainId: this.options.chainId,
      privateKeys: privateKeys || this.options.privateKeys,
      abiMap: this.abiMap, textDecoder, textEncoder
    })
  }

  async abiActions(actions, force = false) {
    const abiFetch = []
    for(const action of actions) {
      abiFetch.push(this.abi(action.account, force))
    }
    await Promise.all(abiFetch)
  }

  async abi(account_name, force = false) {
    if(!force) {
      if(this.abiMap.has(account_name)) {
        return this.abiMap.get(account_name)
      }
    }
    const abi = await this.chain.post('/get_raw_abi', {account_name})
    this.abiMap.set(account_name, abi)
    return abi
  }
}

module.exports = FioApi
