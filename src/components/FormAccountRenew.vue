<template>
  <div>
    <form @submit.prevent="submitForm" class="mb-4">
      <FormAccount
        v-model="address"
        v-on:valid="valid"
        :domains="domains"
        :defaultDomain="defaultDomain"
        :buyAddress="renewAddress"
      >
        <button
          id="check-button"
          type="submit"
          class="btn btn-success mt-4"
          :disabled="address === null"
        >
          <div v-if="!checkAddressLoading && !processingRenew">
            Renew
          </div>
          <div v-else
            class="mb-1 spinner-grow spinner-grow-sm text-light"
            role="status" aria-hidden="true">
          </div>
<!--          <div v-if="priceAfterCredit === 0">-->
<!--            Renew-->
<!--            <span v-if="priceAfterCredit !== priceBeforeCredit">-->
<!--              &nbsp;(with credit)-->
<!--            </span>-->
<!--          </div>-->
<!--          <div v-else>-->
<!--            <span>Pay ${{priceAfterCredit}}</span>-->

<!--            <span v-if="!info.paymentInapp">-->
<!--               via {{info.pay_source.name}}-->
<!--             </span>-->

<!--            <span v-if="priceAfterCredit !== priceBeforeCredit">-->
<!--              &nbsp;(with credit)-->
<!--            </span>-->
<!--          </div>-->
        </button>

        <alert id="renewAccountAlert" class="mt-4"
          :object="renewAccountAlert"
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
import '../plugins/gt-sdk'

export default {
  mixins: [
    ServerMixin('renewResult')
  ],

  data() {
    return {
      address: null,
      validAddress: null,
      renewLoading: false
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
    renewAddress: {
      type: Boolean,
      default: true
    }
  },

  methods: {
    valid(valid) {
      this.validAddress = valid
    },

    submitForm() {
      this.$store.dispatch('Server/reset', {
        key: 'renewResult'
      })
      if (!this.validatedAddress) {
        const { address, publicKey } = this
        this.$store.dispatch('Account/isAccountRegistered', {
          address, publicKey, cb: isRegistered => {
            if (isRegistered) {
              this.renew()
            }
          }
        })
      }
    },

    renew() {
      const { referralCode, address, publicKey } = this
      const redirectUrl = window.location.href

      this.$store.dispatch('Server/post', {
        key: 'renewResult', path: '/public-api/renew-account',
        body: { address, referralCode, publicKey, redirectUrl }
      })
    }
  },

  watch: {
    ['renewResult._loading']: function(loading) {
      this.renewLoading = loading
      if (loading) { return }
      const success = this.renewResult.success

      if (success && success.charge) {
        if (this.info.paymentInapp || !success.charge.forward_url) {
          const { extern_id } = success.charge
          const { returnUrl } = document.location

          this.$router.push({ name: 'checkout', params: { extern_id }, props: { returnUrl } })

        } else {
          const {forward_url} = success.charge
          // Backup the purchase incase the link or window is lost
          localStorage.renewAddressLocation = document.location
          localStorage.renewAddressLocationDate = new Date().toISOString()
          window.location = forward_url
        }
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

    credit() {
      return this.Account.credit
    },

    validatedAddress() {
      return this.address !== null &&
        this.address === this.Account.registeredAccount
    },

    processingRenew() {
      return this.renewLoading
    },

    checkAddressLoading() {
      const type = this.renewAddress ? 'Address' : 'Domain'
      return this.Account.loading[`is${type}Registered`]._loading
    },

    renewAccountAlert() {
      if (this.validAddress === null) {
        return {}
      }

      const type = this.renewAddress ? 'Address' : 'Domain'
      
      if (this.validAddress === false) {
        return {error: 'Invalid ' + type}
      }

      if (this.renewResult.error) {
        return { error: this.renewResult.error }
      }

      if (this.address === this.Account.availableAccount) {
        return { error: `${type} not registered` }
      }
      
      return {}
    },

    priceBeforeCredit() {
      return this.renewAddress ?
        +Number(this.Wallet.wallet.account_renew_price) :
        +Number(this.Wallet.wallet.domain_renew_price)
    },

    priceAfterCredit() {
      // Math.max will not let the price go negative
      return +Math.max(0, this.priceBeforeCredit + this.credit).toFixed(2)
    }
  },

  components: {
    FormAccount,
    Alert
  }
}
</script>

<style scoped>
#renewAccountAlert {
	max-width: 30em;
  text-align: center;
	margin-left: auto;
	margin-right: auto;
}
#check-button {
  min-width: 230px;
}
</style>
