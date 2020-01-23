<template>
  <div>
    <form @submit.prevent="register" class="mb-4">
      <FormAccount
        v-model="address"
        v-on:valid="valid"
        :domains="domains"
        :defaultDomain="defaultDomain"
        :buyAddress="buyAddress">
        <!-- id="address" -->

        <template v-slot:nodomains>
          <div class="alert alert-secondary" role="alert">
            There are no domains for sale under referral code <b>{{referralCode}}</b>.
          </div>
        </template>

        <alert id="regAccountAlert" :object="regAccountAlert"
          class="mt-3" :timeout="0" singleton
        >
        </alert>

        <div v-if="domains.length > 0">
          <button
            id="check-button"
            type="submit"
            class="btn btn-success"
            :disabled="address === null" >
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
              Pay ${{purchasePrice}} via {{AppInfo.pay_source.name}}
            </div>
          </button>
        </div>
      </FormAccount>
    </form>
  </div>
</template>

<script>
import FormAccount from '../components/FormAccount.vue'
import Alert from '../components/Alert.vue'
import {mapState} from 'vuex'

export default {
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
    }
  },

  methods: {
    valid(valid) {
      this.validAddress = valid
    },

    register() {
      if(!this.validatedAddress) {
        const {address} = this
        this.$store.dispatch('Account/isAccountRegistered', {address})
      } else { // Pay
        const {referralCode, address, publicKey} = this
        const redirectUrl = window.location.href

        this.$store.dispatch('Wallet/buyAddress', {address, referralCode, publicKey, redirectUrl})
      }
    }
  },

  watch: {
    ['Wallet.buyAddress.success']: function(val) {
      // Backup the purchase incase the link or window is lost
      localStorage.buyAddressLocation = document.location
      localStorage.buyAddressLocationDate = new Date().toISOString()

      const {forward_url} = val.charge
      if(forward_url) {
        window.location = forward_url
      }
    }
  },

  computed: {
    domains() {
      return this.Wallet.wallet.domains
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

      if(this.Wallet.buyAddress && this.Wallet.buyAddress.error) {
        return {error: this.Wallet.buyAddress.error}
      }

      if(this.validatedAddress) {
        return {success: `${type} "${this.address}" is available for $${this.purchasePrice}/year`}
      }
      return {}
    },

    purchasePrice() {
      return this.buyAddress ?
        this.Wallet.wallet.account_sale_price :
        this.Wallet.wallet.domain_sale_price
    },

    ...mapState({
      Wallet: state => state.Wallet || {},
      Account: state => state.Account || {},
      AppInfo: state => state.AppInfo.info,
    }),
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
