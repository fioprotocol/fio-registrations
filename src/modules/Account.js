import {fio} from '../api'
import Loading from './loading'

const loading = Loading()

export default {
  namespaced: true,

  state: {
    availableAccount: null,
    registeredAccount: null,
    loading: loading.defaults([
      'isAddressRegistered',
      'isDomainRegistered',
    ])
  },

  actions: {
    async isAccountRegistered({commit, state}, {address}) {
      const type = address.indexOf('@') === -1 ? 'Domain' : 'Address'
      loading(state.loading[`is${type}Registered`], async () => {
        const result = await fio.isAccountRegistered(address)
        commit('isAccountRegistered', {isRegistered: result, address})
      })
    },
  },

  mutations: {
    isAccountRegistered(state, {isRegistered, address}) {
      const type = address.indexOf('@') === -1 ? 'Domain' : 'Address'
      loading.done(state.loading[`is${type}Registered`])
      if(isRegistered) {
        state.registeredAccount = address
      } else {
        state.availableAccount = address
      }
    },
  }
}
