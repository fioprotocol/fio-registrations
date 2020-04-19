import {fio} from '../api'
import Loading from './loading'
import {server} from '../api'

const loading = Loading()

export default {
  namespaced: true,

  state: {
    availableAccount: null,
    registeredAccount: null,
    adjustment: 0,
    loading: loading.defaults([
      'isAddressRegistered',
      'isDomainRegistered',
    ])
  },

  actions: {
    /**
      @arg address format: "address@domain" or just "domain"
      @arg publicKey is used to check for an adjustment
    */
    async isAccountRegistered({commit, state}, {address, publicKey}) {
      const type = address.indexOf('@') === -1 ? 'Domain' : 'Address'
      loading(state.loading[`is${type}Registered`], async () => {
        const resultReq = fio.isAccountRegistered(address)

        const balanceReq = server.get(
          '/public-api/balance/' + publicKey
        )

        const [result, balanceRes] = await Promise.all([resultReq, balanceReq])

        let adjustment = 0
        if(balanceRes.success) {
          const bal = +Number(balanceRes.balance.total)
          adjustment = bal
        }

        commit('isAccountRegistered', {
          isRegistered: result, address, adjustment
        })
      })
    },
  },

  mutations: {
    isAccountRegistered(state, {isRegistered, address, adjustment}) {
      const type = address.indexOf('@') === -1 ? 'Domain' : 'Address'
      loading.done(state.loading[`is${type}Registered`])

      state.adjustment = adjustment

      if(isRegistered) {
        state.registeredAccount = address
      } else {
        state.availableAccount = address
      }
    },
  }
}
