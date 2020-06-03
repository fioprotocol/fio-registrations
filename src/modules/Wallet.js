import {server} from '../api'

import Loading from './loading'
const loading = Loading()

export default {
  namespaced: true,

  state: {
    wallet: null,
    alertWallet: {},
    referralCode: null,
    loading: loading.defaults(['wallet'])
  },

  actions: {
    async loadWallet({commit, state}, {referralCode}) {
      loading.singleton(state.loading.wallet, async () => {
        const walletResult = await server.getRefWallet(referralCode)
        commit('loadWallet', {walletResult, referralCode})
      })
    },
    async refreshWallet({commit, state}, {referralCode}) {
      const walletResult = await server.getRefWallet(referralCode)
      commit('loadWallet', {walletResult, referralCode})
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
  }
}
