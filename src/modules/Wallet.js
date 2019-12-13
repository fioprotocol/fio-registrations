import {server} from '../api'

import Loading from './loading'
const loading = Loading()

export default {
  namespaced: true,

  state: {
    wallet: null,
    domains: null,
    alertWallet: {},
    alertDomains: {},
    buyAddress: {
      success: null,
      error: null
    },
    referralCode: null,
    loading: loading.defaults(['wallet', 'domains', 'buyAddress'])
  },

  actions: {
    async loadWallet({commit, state}, {referralCode}) {
      loading.singleton(state.loading.wallet, async () => {
        const walletResult = await server.getRefWallet(referralCode)
        commit('loadWallet', {walletResult, referralCode})
      })
    },

    async loadDomains({commit, state}, {referralCode}) {
      loading.singleton(state.loading.domains, async () => {
        const domainResult = await server.getRefDomains(referralCode)
        commit('loadDomains', domainResult)
      })
    },

    async buyAddress({commit, state}, {
      address, referralCode, publicKey,
      redirectUrl
    }) {
      loading(state.loading.buyAddress, async () => {
        const buyResult = await server.post('/public-api/buy-address', {
          address, referralCode, publicKey, redirectUrl
        })
        commit('buyResult', buyResult)
      })
    },
  },

  mutations: {
    loadWallet(state, {walletResult, referralCode}) {
      if(walletResult.success) {
        state.wallet = walletResult.success
        state.wallet.referralCode = referralCode
      } else {
        state.alertWallet = walletResult.error
      }
      loading.done(state.loading.wallet)
    },

    loadDomains(state, domainResult) {
      if(domainResult.success) {
        state.domains = domainResult.success
      } else {
        state.alertDomains = domainResult.error
      }
      loading.done(state.loading.domains)
    },

    buyResult(state, result) {
      if(result.success) {
        state.buyAddress.success = result.success
        state.buyAddress.error = null
      } else {
        state.buyAddress.error = result.error
        state.buyAddress.success = null
      }
      loading.done(state.loading.buyAddress)
    }
  }
}
