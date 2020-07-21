<template>
  <div>
    <form @submit.prevent="submitForm" class="mb-4">
      <FormAccount
        v-model="address"
        v-on:valid="valid"
        :domains="domains"
        :defaultDomain="defaultDomain"
        :buyAddress="buyAddress"
        :allowPublicDomains="allowPublicDomains"
      >
        <button
          id="check-button"
          type="submit"
          class="btn btn-success mt-4"
          :disabled="address === null || captchaIsLoading || !isCaptchaInitSuccess"
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
            <div v-if="captchaIsLoading"
                 class="mb-1 spinner-grow spinner-grow-sm text-light"
                 role="status" aria-hidden="true">
            </div>
            <div v-else-if="freeSale || priceAfterCredit === 0">
              Register
              <span v-if="priceAfterCredit !== priceBeforeCredit">
                &nbsp;(with credit)
              </span>
            </div>
            <div v-else>
              <span>Pay ${{priceAfterCredit}}</span>

              <span v-if="!info.paymentInapp">
                 via {{info.pay_source.name}}
               </span>

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
import '../plugins/gt-sdk'

export default {
  mixins: [
    ServerMixin('buyResult'),
    ServerMixin('getCaptchaResult')
  ],

  data() {
    return {
      address: null,
      validAddress: null,
      limitError: false,
      domainIsNotRegistered: false,
      domainIsNotPublic: false,
      captchaObj: null,
      captchaLoading: false,
      captchaErrored: false
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
      this.limitError = false
      this.domainIsNotRegistered = false
      this.domainIsNotPublic = false
      this.validAddress = valid
    },

    submitForm() {
      if (this.captchaIsLoading) return
      this.limitError = false
      this.domainIsNotRegistered = false
      this.domainIsNotPublic = false
      this.$store.dispatch('Server/reset', {
        key: 'buyResult'
      })
      if (!this.validatedAddress) {
        const {address, publicKey} = this
        if (this.buyAddress) {
          const selectedDomain = address.split('@')[1]
          const domainLimit = this.Wallet.wallet.domains_limit[selectedDomain] || null
          const registered = this.Wallet.wallet.accountsByDomain[selectedDomain] || 0
          if (domainLimit !== null && registered >= parseInt(domainLimit)) {
            return this.limitError = true
          }
          if (this.allowPublicDomains && this.domains.indexOf(selectedDomain) < 0) {
            return this.$store.dispatch('Account/checkWithPublicDomain', {
              address,
              publicKey,
              cb: ({ isDomainPublic, isDomainRegistered, isAccountRegistered }) => {
                if (!isDomainRegistered) {
                  return this.domainIsNotRegistered = true
                }
                if (!isDomainPublic) {
                  return this.domainIsNotPublic = true
                }
                this.afterAvailCheck(isAccountRegistered)
              }
            })
          }
        }
        this.$store.dispatch('Account/isAccountRegistered', {address, publicKey, cb: this.afterAvailCheck})
      } else {
        if (this.buyAddress && this.freeSale) {
          if (this.getCaptchaResult.skipCaptcha) return this.register({ skipCaptcha: this.getCaptchaResult.skipCaptcha})
          if (!this.captchaObj) return
          this.captchaObj.verify()
          this.captchaObj.onSuccess(() => {
            const result = this.captchaObj.getValidate();
            if (!result) {
              return alert('Please complete verification');
            }

            const captchaParams = {
              geetest_challenge: result.geetest_challenge,
              geetest_validate: result.geetest_validate,
              geetest_seccode: result.geetest_seccode
            }
            this.register(captchaParams)
          })
          this.captchaObj.onError(e => {
            console.log('captcha errored')
            console.log(e)
          });
        } else {
          this.register()
        }
      }
    },

    register(captchaParams = {}) {
      const { referralCode, address, publicKey } = this
      const redirectUrl = window.location.href

      this.$store.dispatch('Server/post', {
        key: 'buyResult', path: '/public-api/buy-address',
        body: { address, referralCode, publicKey, redirectUrl, ...captchaParams }
      })
    },

    initCaptcha() {
      if (this.captchaObj) {
        try {
          this.captchaObj.reset();
          this.captchaObj = null
        } catch (e) {
          //
          console.log(e);
        }
      }
      this.captchaErrored = false
      this.$store.dispatch('Server/get', {
        key: 'getCaptchaResult', path: '/public-api/gt/register-slide'
      })
    },

    afterAvailCheck(isRegistered) {
      if (this.buyAddress && this.freeSale && !isRegistered) {
        this.initCaptcha()
      }
    }
  },

  watch: {
    ['buyResult._loading']: function(loading) {
      if (loading) { return }
      if (this.buyResult.captchaStatus === 'fail') {
        try {
          if (this.captchaObj) this.captchaObj.reset();
        } catch (e) {
          //
          console.log(e);
        }
        return
      }
      const success = this.buyResult.success

      if (success && success.charge) {
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
    },
    ['getCaptchaResult._loading']: function(loading) {
      this.captchaLoading = true
      if (loading) return
      const data = this.getCaptchaResult
      if (data.skipCaptcha) {
        this.captchaObj = null
        this.captchaLoading = false
        this.captchaErrored = false
        return
      }
      if (!data.success) {
        this.captchaObj = null
        this.captchaLoading = false
        this.captchaErrored = true
        return
      }
      window.initGeetest({
        gt: data.gt,
        challenge: data.challenge,
        offline: !data.success,
        new_captcha: true,
        lang: 'en',
        product: "bind",
        width: "400px"
      }, captchaObj => {
        captchaObj.onReady(() => {
          this.captchaLoading = false
        });
        this.captchaObj = captchaObj
      })
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

    captchaIsLoading() {
      return this.captchaLoading
    },

    checkAddressLoading() {
      const type = this.buyAddress ? 'Address' : 'Domain'
      return this.Account.loading[`is${type}Registered`]._loading
    },

    regAccountAlert() {
      if(this.registrationPending) {
        return {} // TrxMonitor shows a message in this case
      }

      if(this.validAddress === null) {
        return {}
      }

      if (this.limitError === true) {
        return { error: 'FIO Address registrations no longer available for that domain' }
      }

      if (this.domainIsNotRegistered === true) {
        return { error: 'Domain is not registered' }
      }

      if (this.domainIsNotPublic === true) {
        return { error: 'Domain is not public' }
      }

      if(this.validAddress === false) {
        const type = this.buyAddress ? 'address' : 'domain'
        return {error: 'Invalid ' + type}
      }

      const type = this.buyAddress ? 'Address' : 'Domain'
      if(this.address === this.Account.registeredAccount) {
        return {error: `${type} "${this.address}" is already registered`}
      }

      if (this.buyResult.error) {
        return {error: this.buyResult.error}
      }

      if (this.captchaErrored) {
        return { error: 'Temporarily unavailable' }
      }

      if(this.validatedAddress) {
        if(this.freeSale) {
          return {success: `${type} "${this.address}" is available`}
        }
        return {success: `${type} "${this.address}" is available for $${this.priceBeforeCredit}/year`}
      }
      return {}
    },

    isCaptchaInitSuccess() {
      return !this.captchaErrored
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

    allowPublicDomains() {
      return this.Wallet.wallet.allow_pub_domains
    }
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
