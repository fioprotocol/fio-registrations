import {fio} from '../api'
import Loading from './loading'
import {server} from '../api'

const loading = Loading()

export default {
  namespaced: true,

  state: {
    availableAccount: null,
    registeredAccount: null,
    isDomainRegistered: null,
    isDomainPublic: null,
    credit: 0,
    loading: loading.defaults([
      'isAddressRegistered',
      'isDomainRegistered',
      'isCheckedWithPublicDomainLoading',
    ])
  },

  actions: {
    /**
      @arg address format: "address@domain" or just "domain"
      @arg publicKey is used to check for a credit
      @arg cb callback (optional)
    */
    async isAccountRegistered({commit, state}, {address, publicKey, cb}) {
      const type = address.indexOf('@') === -1 ? 'Domain' : 'Address'
      loading(state.loading[`is${type}Registered`], async () => {
        const resultReq = fio.isAccountRegistered(address)

        const balanceReq = server.get(
          '/public-api/balance/' + publicKey
        )

        const [result, balanceRes] = await Promise.all([resultReq, balanceReq])

        let credit = 0
        if(balanceRes.success) {
          const bal = +Number(balanceRes.balance.total)
          if(bal < 0) {
            credit = bal
          }
        }

        commit('isAccountRegistered', {
          isRegistered: result, address, credit
        })
        if (cb) cb(result)
      })
    },

    /**
      @arg address format: "address@domain"
      @arg publicKey is used to check for a credit
      @arg cb callback (optional)
    */
    async checkWithPublicDomain({commit, state}, {address, publicKey, cb}) {
      const domain = address.split('@')[1]
      loading(state.loading[`isCheckedWithPublicDomainLoading`], async () => {
        const isAccountRegReq = fio.isAccountRegistered(address)
        const isDomainRegisteredReq = fio.isAccountRegistered(domain)
        const isDomainPublicReq = fio.isDomainPublic(domain)

        const balanceReq = server.get(
          '/public-api/balance/' + publicKey
        )

        const [isDomainRegistered, isDomainPublic, isAccountRegistered, balanceRes] =
          await Promise.all([isDomainRegisteredReq, isDomainPublicReq, isAccountRegReq, balanceReq])

        let credit = 0
        if(balanceRes.success) {
          const bal = +Number(balanceRes.balance.total)
          if(bal < 0) {
            credit = bal
          }
        }

        commit('checkWithPublicDomain', {
          isDomainRegistered, isDomainPublic
        })
        if (isDomainRegistered && isDomainPublic) {
          commit('isAccountRegistered', {
            isRegistered: isAccountRegistered, address, credit
          })
        }
        if (cb) cb({
          isDomainPublic,
          isDomainRegistered,
          isAccountRegistered
        })
      })
    },
  },

  mutations: {
    isAccountRegistered(state, {isRegistered, address, credit}) {
      const type = address.indexOf('@') === -1 ? 'Domain' : 'Address'
      loading.done(state.loading[`is${type}Registered`])

      state.credit = credit

      if(isRegistered) {
        state.registeredAccount = address
      } else {
        state.availableAccount = address
      }
    },
    checkWithPublicDomain(state, {isDomainRegistered, isDomainPublic}) {
      state.isDomainRegistered = isDomainRegistered
      state.isDomainPublic = isDomainPublic
    },
  }
}
