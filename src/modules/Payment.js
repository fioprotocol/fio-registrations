import Vue from 'vue'
import Loading from './loading'

import CoinbasePluginClient from '../../server/plugins/payment/coinbase/client.js'

const loading = Loading()
const coinbase = new CoinbasePluginClient()

function defaultState() {
  return {
    charge: {
      ...loading.defaults()
    }
  }
}

export default {
  namespaced: true,

  state: defaultState(),

  actions: {
    async getCharge({commit, state}, {extern_id}) {
      loading(state.charge, async () => {
        const charge = await coinbase.getCharge(extern_id)
        commit('getCharge', charge)
      })
    },

    async reset({state}) {
      const data = defaultState()
      const keys = Object.keys(data)
      keys.forEach(key => {
        Vue.set(state, key, data[key])
      })
    },
  },

  mutations: {
    getCharge(state, charge) {
      // const data = state.charge
      // if(data == null) {
      //   // A component can be destroyed before a request finishes
      //   return
      // }
      loading.done(state.charge)
      for (let field in charge) {
        const value = charge[field]
        Vue.set(state.charge, field, value)
      }
    }
  }
}
