<template>
  <div>
    <form @submit.prevent="register" class="mb-4">
      <FormAccount
        v-model="address"
        v-on:valid="valid"
        :domains="domains"
        :defaultDomain="defaultDomain"
        :buyAddress="buyAddress"
      >
        <button
          id="check-button"
          type="submit"
          class="btn btn-success mt-4"
          :disabled="address === null"
        >
          <div v-if="!validatedAddress">
            <div v-if="!checkAddressLoading">
              Check Availability
            </div>
            <div v-else
              class="mb-1 spinner-grow spinner-grow-sm text-light"
              role="status" aria-hidden="true">
            </div>
          </div>
          <div v-if="validatedAddress">
            <div v-if="freeSale || priceAfterCredit === 0">
              Register
              <span v-if="priceAfterCredit !== priceBeforeCredit">
                &nbsp;(with credit)
              </span>
            </div>
            <div v-else>
              Pay ${{priceAfterCredit}} via {{info.pay_source.name}}
              <span v-if="priceAfterCredit !== priceBeforeCredit">
                &nbsp;(with credit)
              </span>
            </div>
          </div>
        </button>

        <alert id="regAccountAlert" class="mt-4"
          :object="regAccountAlert"
          :timeout="0" singleton
        >
        </alert>
      </FormAccount>
    </form>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import FormAccount from '../components/FormAccount.vue'
import Alert from '../components/Alert.vue'
import ServerMixin from './ServerMixin'

export default {
  mixins: [
    ServerMixin('buyResult')
  ],

  data() {
    return {
      address: null,
      validAddress: null
    }
  },

  props: {
    referralCode: {
      type: String,
      default: null
    },
    defaultDomain: {
      type: String,
      default: null
    },
    publicKey: {
      type: String,
      required: true
    },
    buyAddress: {
      type: Boolean,
      default: true
    },
    registrationPending: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    valid(valid) {
      this.validAddress = valid
    },

    register() {
      if(!this.validatedAddress) {
        const {address, publicKey} = this
        this.$store.dispatch('Account/isAccountRegistered', {address, publicKey})
      } else {
        const {referralCode, address, publicKey} = this
        const redirectUrl = window.location.href

        this.$store.dispatch('Server/post', {
          key: 'buyResult', path: '/public-api/buy-address',
          body: {address, referralCode, publicKey, redirectUrl}
        })
      }
    }
  },

  watch: {
    ['buyResult._loading']: function(loading) {
      if(loading) { return }
      const success = this.buyResult.success

      if(success.charge) {
        if(this.info.paymentInapp || !success.charge.forward_url) {
          const { extern_id } = success.charge
          const { returnUrl } = document.location

          this.$router.push({name: 'checkout',
            params: { extern_id }, props: { returnUrl }})

        } else {
          const {forward_url} = success.charge
          // Backup the purchase incase the link or window is lost
          localStorage.buyAddressLocation = document.location
          localStorage.buyAddressLocationDate = new Date().toISOString()
          window.location = forward_url
        }
      }

      if(success === true) {
        // freeSale account
        this.$emit('registrationPending', true)
      }
    }
  },

  computed: {
    ...mapState({
      Wallet: state => state.Wallet || {},
      Account: state => state.Account || {},
      info: state => state.AppInfo.info,
    }),

    domains() {
      return this.Wallet.wallet.domains
    },

    freeSale() {
      return Number(this.priceBeforeCredit) === 0
    },

    credit() {
      return this.Account.credit
    },

    validatedAddress() {
      return this.address !== null &&
        this.address === this.Account.availableAccount
    },

    checkAddressLoading() {
      const type = this.buyAddress ? 'Address' : 'Domain'
      return this.Account.loading[`is${type}Registered`]._loading
    },

    regAccountAlert() {
      if(this.registrationPending) {
        return {success: 'Registration pending'}
      }

      if(this.validAddress === null) {
        return {}
      }

      if(this.validAddress === false) {
        const type = this.buyAddress ? 'address' : 'domain'
        return {error: 'Invalid ' + type}
      }

      const type = this.buyAddress ? 'Address' : 'Domain'
      if(this.address === this.Account.registeredAccount) {
        return {error: `${type} "${this.address}" is already registered`}
      }

      if(this.buyResult.error) {
        return {error: this.buyResult.error}
      }

      if(this.validatedAddress) {
        if(this.freeSale) {
          return {success: `${type} "${this.address}" is available`}
        }
        return {success: `${type} "${this.address}" is available for $${this.priceBeforeCredit}/year`}
      }
      return {}
    },

    priceBeforeCredit() {
      return this.buyAddress ?
        +Number(this.Wallet.wallet.account_sale_price) :
        +Number(this.Wallet.wallet.domain_sale_price)
    },

    priceAfterCredit() {
      // Math.max will not let the price go negative
      return +Math.max(0, this.priceBeforeCredit + this.credit).toFixed(2)
    },
  },

  components: {
    FormAccount,
    Alert
  }
}
</script>

<style scoped>
#regAccountAlert {
	max-width: 30em;
  text-align: center;
	margin-left: auto;
	margin-right: auto;
}
#check-button {
  min-width: 230px;
}
</style>
