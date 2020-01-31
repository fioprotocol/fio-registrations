import {server} from '../api'
import Loading from './loading'

const loading = Loading()

export default {
  namespaced: true,
  state: {
    info: {},
    ...loading.defaults()
  },
  actions: {
    async load({commit, state}) {
      loading.singleton(state, async () => {
        const result = await server.getAppInfo()
        commit('load', result)
      })
    }
  },
  mutations: {
    load(state, result) {
      state.info = result
      if(result.paymentInapp) {
        delete localStorage.buyAddressLocation
        delete localStorage.buyAddressLocationDate
      }

      loading.done(state)
    }
  }
}
