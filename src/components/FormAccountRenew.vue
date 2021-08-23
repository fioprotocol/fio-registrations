<template>
  <div>
    <form @submit.prevent="submitForm" class="mb-4">
      <FormAccount
        v-model="address"
        v-on:valid="valid"
        :domains="domains"
        :defaultDomain="defaultDomainValue"
        :defaultAddress="defaultAddressValue"
        :buyAddress="renewAddress"
        :allowPublicDomains="allowPublicDomains"
      >
        <button
          id="check-button"
          type="submit"
          class="btn btn-success mt-4"
          :disabled="address === null || checkAddressLoading || processingRenew || checkAddressPubKeyLoading"
        >
          <div v-if="!checkAddressLoading && !processingRenew && !checkAddressPubKeyLoading">
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
        <alert id="renewAccountWarning" class="mt-4"
          :object="renewAccountWarning"
          :timeout="0"
        >
        </alert>
      </FormAccount>
    </form>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import { debounce } from 'lodash'
import FormAccount from '../components/FormAccount.vue'
import Alert from '../components/Alert.vue'
import { FIO_ADDRESS_DELIMITER } from '../constants';
import ServerMixin from './ServerMixin'
import '../plugins/gt-sdk'

export default {
  mixins: [
    ServerMixin('renewResult')
  ],

  data() {
    const defaultFioName = this.$route.query.fioName || ''
    let [address, domain] = defaultFioName.split(FIO_ADDRESS_DELIMITER)
    if (address && !domain) {
      domain = address
      address = ''
    }
    return {
      address: null,
      validAddress: null,
      renewLoading: false,
      ownerPublicKey: null,
      addressFromUrl: address,
      domainFromUrl: domain
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
      required: false
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
        this.$store.dispatch('Account/isAccountCouldBeRenewed', {
          address, publicKey, cb: renewable => {
            if (renewable) {
              this.$store.dispatch('Account/getPubAddress', {
                address,
                cb: () => {
                  this.renew()
                }
              })
            }
          }
        })
      } else {
        this.$store.dispatch('Account/getPubAddress', {
          address: this.address,
          cb: () => {
            this.renew()
          }
        })
      }
    },

    renew() {
      const { referralCode, address } = this
      const redirectUrl = window.location.href

      this.$store.dispatch('Server/post', {
        key: 'renewResult', path: '/public-api/renew',
        body: { address, referralCode, publicKey: this.Account.pubAddress, redirectUrl }
      })
    },

    checkPublicAddress: debounce(function(address) {
      if (!address) return
      this.$store.dispatch('Account/getPubAddress', {
        address,
        cb: publicKey => {
          this.$nextTick(() => {
            this.ownerPublicKey = publicKey
          })
        }
      })
    }, 500)
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

          this.$router.push({ name: 'checkout', params: { extern_id }, props: { returnUrl, accountType: 'renewal' } })

        } else {
          const {forward_url} = success.charge
          // Backup the purchase incase the link or window is lost
          localStorage.renewAddressLocation = document.location
          localStorage.renewAddressLocationDate = new Date().toISOString()
          window.location = forward_url
        }
      }
    },
    address: function(value) {
      this.checkPublicAddress(value)
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
      return this.Account.loading[`isAccountCouldBeRenewed`]._loading
    },

    checkAddressPubKeyLoading() {
      return this.Account.loading[`getPubAddress`]._loading
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

      if (this.address === this.Account.notRenewable) {
        return { error: `${type} not registered` }
      }

      return {}
    },

    renewAccountWarning() {
      if (this.validAddress === false) {
        return {}
      }

      const type = this.renewAddress ? 'Address' : 'Domain'

      if (this.ownerPublicKey && this.publicKey && this.ownerPublicKey !== this.publicKey) {
        return { warning: `${type} is owned by a public key that is different from the key that was sent in. Please confirm you are renewing the correct FIO Address.` }
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
    },

    allowPublicDomains() {
      return this.Wallet.wallet.allow_pub_domains
    },

    defaultDomainValue() {
      if (
        this.renewAddress &&
        this.Wallet.wallet.domains &&
        this.Wallet.wallet.domains.indexOf(this.domainFromUrl) > -1
      )
        return this.domainFromUrl;

      return this.domainFromUrl || this.defaultDomain;
    },

    defaultAddressValue() {
      if (
        this.renewAddress &&
        this.addressFromUrl &&
        this.Wallet.wallet.domains &&
        this.Wallet.wallet.domains.indexOf(this.domainFromUrl) > -1
      )
        return this.addressFromUrl;

      return "";
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
