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
    pubAddress: null,
    credit: 0,
    loading: loading.defaults([
      'isAddressRegistered',
      'isDomainRegistered',
      'isCheckedWithPublicDomain',
      'getPubAddress'
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

        try {
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
        } catch (e) {
          console.error(e)
          throw new Error('There was an issue while checking your address.')
        }
      })
    },

    async resetAvailableAccount({commit}) {
      commit('resetAvailableAccount', {
        availableAccount: null
      })
    },

    /**
      @arg address format: "address@domain"
      @arg publicKey is used to check for a credit
      @arg cb callback (optional)
    */
    async checkWithPublicDomain({commit, state}, {address, publicKey, cb}) {
      const domain = address.split('@')[1]
      loading(state.loading[`isCheckedWithPublicDomain`], async () => {
        if (!domain) throw new Error('Invalid address')
        const isAccountRegReq = fio.isAccountRegistered(address)
        const isDomainRegisteredReq = fio.isAccountRegistered(domain)
        const isDomainPublicReq = fio.isDomainPublic(domain)

        const balanceReq = server.get(
          '/public-api/balance/' + publicKey
        )

        let responses = []
        try {
          responses = await Promise.all([isDomainRegisteredReq, isDomainPublicReq, isAccountRegReq, balanceReq])
        } catch (e) {
          console.error(e)
          throw new Error('There was an issue while checking your address.')
        }

        const [isDomainRegistered, isDomainPublic, isAccountRegistered, balanceRes] = responses
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

    async getPubAddress({commit, state}, {address, cb}) {
      loading(state.loading[`getPubAddress`], async () => {
        let resultReq
        if (address.indexOf('@') > -1) {
          resultReq = fio.getAddress(address)
        } else {
          resultReq = fio.getPubAddressByDomain(address)
        }

        const result = await Promise.resolve(resultReq)

        commit('getPubAddress', {
          pubAddress: result, address
        })
        if (cb) cb(result)
      })
    },

    async resetErrors({state}) {
      loading.resetError(state.loading[`isCheckedWithPublicDomain`])
      loading.resetError(state.loading['isAddressRegistered'])
      loading.resetError(state.loading['isDomainRegistered'])
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
    resetAvailableAccount(state, {availableAccount}) {
      state.availableAccount = availableAccount
    },
    checkWithPublicDomain(state, {isDomainRegistered, isDomainPublic}) {
      loading.done(state.loading[`isCheckedWithPublicDomain`])
      state.isDomainRegistered = isDomainRegistered
      state.isDomainPublic = isDomainPublic
    },
    getPubAddress(state, {pubAddress, address}) {
      loading.done(state.loading[`getPubAddress`])
      state.pubAddress = pubAddress
    }
  }
}
