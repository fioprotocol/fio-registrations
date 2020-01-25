<template>
  <div id="app">
    <div>
      <img v-if="Wallet.wallet" :src="logo" id="logo">
    </div>

    <div class="mt-4">
      <h1>{{Wallet.wallet && Wallet.wallet.name}} Registrations</h1>
    </div>

    <h5>username@domain</h5>
    <br/>

    <div v-if="!urlPublicKey">
      Public key parmeter is missing&hellip;
      <br/>
      <code>
        {{href}}?publicKey=xyz
      </code>
    </div>

    <div v-if="urlPublicKey && validPublicKey === false">
      <b>Invalid public key&hellip;</b>
      <br/>
      <div class="text-danger">
        Check your link.
      </div>
    </div>

    <div v-if="validPublicKey && Wallet.wallet">
      <div v-if="!regAddress && !regDomain">
        <div>
          <b>Sale Closed</b>
        </div>
        <div class="text-danger">
          Please try back soon&hellip;
        </div>
      </div>

      <div class="mt-3" v-if="!buyAgain || pending">
        <TrxMonitor
          :topActive="1"
          :refresh="refresh"
          :publicKey="urlPublicKey"
          :referralCode="referralCode"
          @pending="pending = true"
        />
        <br>
      </div>

      <div v-if="pending && !buyAgain">
        <button class="btn btn-success" @click="buyAgainClick()">
          Buy Again
        </button>
      </div>

      <div v-if="!pending || buyAgain">
        <div class="container">
          <div>
            <div class="row">
              <div v-if="regAddress" class="col-sm">
                <h4>Address</h4>
                <br/>
                <FormAccountReg
                  :referralCode="referralCode"
                  :defaultDomain="defaultDomain"
                  :publicKey="urlPublicKey"
                  :buyAddress="true"
                  :registrationPending="accountReg"
                  @registrationPending="accountReg = $event"
                />
                <div class="text-left">
                  <div class="list-group">
                    <small class="list-group-item">
                      &rsaquo;&nbsp;Memorable name for your crypto wallet<br/>
                      &rsaquo;&nbsp;Works across all participating wallets<br/>
                      <span v-if="Number(Wallet.wallet.account_sale_price) > 0">
                        &rsaquo;&nbsp;Reserve now for {{Wallet.wallet.account_sale_price}} USDC or equivalent
                      </span>
                    </small>
                  </div>
                </div>
              </div>

              <div v-if="regDomain" class="col-sm">
                <h4>Domain</h4>
                <br/>
                <FormAccountReg
                  :referralCode="referralCode"
                  :defaultDomain="defaultDomain"
                  :publicKey="urlPublicKey"
                  :buyAddress="false"
                />
                <div class="text-left">
                  <div class="list-group">
                    <small class="list-group-item">
                      &rsaquo;&nbsp;Create FIO Addresses on your own domain<br/>
                      &rsaquo;&nbsp;Transferable between wallets and users<br/>
                      &rsaquo;&nbsp;Reserve now for {{Wallet.wallet.domain_sale_price}} USDC or equivalent
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <TrxMonitor
          :refresh="refresh"
          :afterTopActive="1"
          :publicKey="urlPublicKey"
          :referralCode="referralCode"
          @pending="pending = true"
        >

          <template v-slot:header-if-showing>
            <div class="mt-4">
              <hr/>
              <h5>Prior Registrations</h5>
            </div>
          </template>
        </TrxMonitor>
        <br>
      </div>
    </div>

    <!-- <br/>
    <div>
      <ul>
        <li>
          <router-link :to="{name: 'about'}">About</router-link>
        </li>
      </ul>
    </div> -->
  </div>
</template>

<script>
import '../assets/custom.scss'

import FormAccountReg from '../components/FormAccountReg.vue'
import TrxMonitor from '../components/TrxMonitor.vue'
import ServerMixin from '../components/ServerMixin'
import {mapState} from 'vuex'

export default {
  name: 'Home',
  props: {
    referralCode: String,
    defaultDomain: String,
  },

  mixins: [
    ServerMixin('checkPublicKey'),
  ],

  components: {
    FormAccountReg,
    TrxMonitor
  },

  data() {
    return {
      urlPublicKey: this.$route.query.publicKey,
      href: '',
      buyAgain: false,
      pending: false,
      validPublicKey: null,
      accountRegPending: false,
      refresh: null
    }
  },

  methods: {
    buyAgainClick() {
      this.buyAgain = true
      this.accountReg = false
    }
  },

  created() {
    const {publicKey} = this.$route.query

    if(publicKey) {
      this.$store.dispatch('Server/get', {
        key: 'checkPublicKey',
        path: '/public-api/check-public-key/' + publicKey
      })
    }

    if(!publicKey) {
      if(localStorage.buyAddressLocation) {
        // recover from a lost window
        if(localStorage.buyAddressLocationDate) {
          const dated = new Date(localStorage.buyAddressLocationDate)
          // expire in 30 days
          if(dated.getTime() > Date.now() + (30 * 24 * 60 * 60 * 1000)) {
            delete localStorage.buyAddressLocation
            delete localStorage.buyAddressLocationDate
            return
          }
        }
        document.location = localStorage.buyAddressLocation
        return
      }
    }

    this.$store.dispatch('AppInfo/load')
    this.$store.dispatch('Wallet/loadWallet', {
      referralCode: this.referralCode
    })

    this.href = window.location.href
  },

  watch: {
    ['checkPublicKey._loading']: function(loading) {
      if(!loading) {
        this.validPublicKey = this.checkPublicKey.success
      }
    }
  },

  computed: {
    ...mapState({
      Wallet: state => state.Wallet,
      Account: state => state.Account
    }),

    logo() {
      if(!this.Wallet) {
        return null
      }

      if(this.Wallet.wallet.logo_url == null || this.Wallet.wallet.logo_url === '') {
        return '/images/logo.svg'
      }

      return this.Wallet.wallet.logo_url
    },

    regDomain() {
      const reg = !document.location.pathname ||
        document.location.pathname === '/' ||
        /^\/ref\/?/.test(document.location.pathname) ||
        /^\/domain\/?/.test(document.location.pathname)

      if(!reg) {
        return false
      }

      return this.Wallet.wallet &&
        this.Wallet.wallet.domain_sale_active &&
        this.Wallet.wallet.domains.length > 0
    },

    regAddress() {
      const reg = !document.location.pathname ||
        document.location.pathname === '/' ||
        /^\/ref\/?/.test(document.location.pathname) ||
        /^\/address\/?/.test(document.location.pathname)

      if(!reg) {
        return false
      }

      return this.Wallet.wallet &&
        this.Wallet.wallet.account_sale_active
    },

    accountReg: {
      get: function() {
        return this.accountRegPending
      },
      set: function(newValue) {
        this.accountRegPending = newValue
        if(newValue) {
          this.buyAgain = false
          this.pending = true
          this.refresh = Date.now()
        }
      }
    },
  }
}
</script>

<style scope>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0 auto;
  margin-top: 60px;
}

#logo {
  width: 300px;
  height: 100px;
}
</style>
