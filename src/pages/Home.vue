<template>
  <div id="app">
    <div class="mb-5">
      <img v-if="Wallet.wallet" :src="logo" id="logo">
    </div>

    <div v-if="!regPublicKey && !inputPublicKey">
      <div class="container text-center">
        <div class="card mx-auto">
          <div class="card-header">
            <h4>
              You need to link your wallet first
            </h4>
          </div>
          <div class="container text-left">
            <div v-if="!enterPublicKey">
              <div class="mt-3">
                Many wallets support FIO Protocol and allow you to easily register FIO Address or FIO Domain and link it to that wallet. Check your favorite wallet for a FIO Address registration.
              </div>

              <div class="mt-3 mb-3">
                Alternatively, you enter FIO Public key manually. To do so,
                <a href @click.prevent="enterPublicKey = true" class="primary-link">click here</a>.
              </div>
            </div>

            <div v-else>
              <div class="form-group mb-3">
                <label for="regPublicKey">Public Key:</label>
                <PublicKeyInput @valid="inputPublicKey = $event" />
                <!-- <small class="form-text text-muted">
                </small> -->
              </div>

              <div class="text-left mb-4 container">
                <h5>WARNING!</h5>
                <ul id="ul-a">
                  <li>Once you enter your FIO Public key you will not be able to change it, even if you have made an error or loose the associated private key.</li>
                  <li>This option should only be used by crypto experts who understand what they are doing.</li>
                  <li>We strongly recommend that you use one of our partner wallets instead.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="regPublicKey && validPublicKey === false">
      <b>Invalid public key&hellip;</b>
      <br/>
      <div class="text-danger">
        Check your link.
      </div>
    </div>

    <div v-if="regPublicKey && validPublicKey && Wallet.wallet">
      <div v-if="!regAddress && !regDomain && !renewDomain && !renewAddress">
        <div>
          <b>Sale Closed</b>
        </div>
        <div class="text-danger">
          Please try back soon&hellip;
        </div>
      </div>

      <div v-if="!buyAgain">
        <div class="mb-4">
          <TrxMonitor
            topActive
            :refresh="refresh"
            :publicKey="regPublicKey"
            :referralCode="referralCode"
            @pending="setPending($event)"
            @status="status = $event"
          />
        </div>
      </div>

      <div
        v-if="/^Registered$|Awaiting blockchain finality/.test(status)"
        class="mb-4 container"
      >
        <div class="alert alert-success" role="alert">
          You can now close this window
        </div>
      </div>

      <div v-if="pending === true && !buyAgain">
        <button v-if="renewDomain || renewAddress" class="btn btn-success" @click="buyAgainClick()">
          Renew Another Name
        </button>
        <button v-if="regDomain || regAddress" class="btn btn-success" @click="buyAgainClick()">
          Buy Another Name
        </button>
      </div>

      <div v-if="pending === false || buyAgain">
        <div class="container">
          <div>
            <div class="row">
              <div v-if="regAddress" class="col-sm">
                <h4>Register FIO Address</h4>
                <p class="h5"><strong>username</strong>@domain</p>
                <br/>
                <FormAccountReg
                  :referralCode="referralCode"
                  :defaultDomain="defaultDomain"
                  :publicKey="regPublicKey"
                  :buyAddress="true"
                  :registrationPending="accountReg"
                  @registrationPending="accountReg = $event"
                />
                <div class="text-left mb-4">
                  <div class="list-group">
                    <small class="list-group-item marketing">
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
                <h4>Register FIO Domain</h4>
                <p class="h5">username@<strong>domain</strong></p>
                <br/>
                <FormAccountReg
                  :referralCode="referralCode"
                  :defaultDomain="defaultDomain"
                  :publicKey="regPublicKey"
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
              
              <div v-if="renewAddress" class="col-sm">
                <h4>Renew FIO Address</h4>
                <p class="h5"><strong>username</strong>@domain</p>
                <br/>
                <FormAccountRenew
                        :referralCode="referralCode"
                        :defaultDomain="defaultDomain"
                        :publicKey="regPublicKey"
                        :renewAddress="true"
                        :registrationPending="accountReg"
                        @registrationPending="accountReg = $event"
                />
                <div class="text-left mb-4">
                  <div class="list-group">
                    <small class="list-group-item marketing">
                      &rsaquo;&nbsp;Renew now for {{Wallet.wallet.account_renew_price}} USDC or equivalent
                    </small>
                  </div>
                </div>
              </div>

              <div v-if="renewDomain" class="col-sm">
                <h4>Renew FIO Domain</h4>
                <p class="h5">username@<strong>domain</strong></p>
                <br/>
                <FormAccountRenew
                        :referralCode="referralCode"
                        :defaultDomain="defaultDomain"
                        :publicKey="regPublicKey"
                        :buyAddress="false"
                />
                <div class="text-left">
                  <div class="list-group">
                    <small class="list-group-item">
                      &rsaquo;&nbsp;Renew now for {{Wallet.wallet.domain_renew_price}} USDC or equivalent
                    </small>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3" v-if="regAddress || regDomain">
        <TrxMonitor
          :afterTopActive="!buyAgain"
          :refresh="refresh"
          :publicKey="regPublicKey"
          :referralCode="referralCode"
          @pending="buyAgain ? setPending($event) : () => {}"
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

    <div class="footer text-center py-3">
      <br/>
      <div class="container">
        <span class="text-muted">fioprotocol.io</span>
      </div>
    </div>

    <!-- <div v-if="inputPublicKey">
      <div class="alert alert-info mt-3 container" role="alert">
        Public key accepted
      </div>
    </div> -->

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

import PublicKeyInput from '../components/PublicKeyInput.vue'
import FormAccountReg from '../components/FormAccountReg.vue'
import FormAccountRenew from '../components/FormAccountRenew.vue'
import TrxMonitor from '../components/TrxMonitor.vue'
import ServerMixin from '../components/ServerMixin'
import {mapState} from 'vuex'

const walletRefreshTimeout = 15 * 1000 * 60 // 15 min

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
    PublicKeyInput,
    FormAccountReg,
    FormAccountRenew,
    TrxMonitor
  },

  data() {
    return {
      enterPublicKey: false,
      regPublicKey: this.$route.query.publicKey,
      inputPublicKey: null,
      href: '',
      buyAgain: false,
      pending: null,
      validPublicKey: null,
      accountRegPending: false,
      refresh: null,
      status: null
    }
  },

  methods: {
    setPending(pending) {
      this.pending = pending
      if(this.pending === null) {
        this.buyAgain = true
      }
    },

    buyAgainClick() {
      this.buyAgain = true
      this.accountReg = false
      this.refresh = Date.now()
    },
    
    refreshWallet(referralCode) {
      setTimeout(() => {
        this.$store.dispatch('Wallet/refreshWallet', {
          referralCode
        })
        this.refreshWallet(referralCode)
      }, walletRefreshTimeout)
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
    this.refreshWallet(this.referralCode)

    this.href = window.location.href
  },

  watch: {
    ['checkPublicKey._loading']: function(loading) {
      if(loading === false) {
        this.validPublicKey = this.checkPublicKey.success
      }
    },

    inputPublicKey: function(inputPublicKey) {
      this.validPublicKey = true
      this.regPublicKey = inputPublicKey

      const url = new URLSearchParams(document.location.search)
      url.set('publicKey', inputPublicKey)
      const path = document.location.pathname + '?' + url.toString()
      history.pushState(null, null, path)
      // document.location = path
    },
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
      const reg = (!document.location.pathname ||
        document.location.pathname === '/' || 
        /^\/ref\/?/.test(document.location.pathname) ||
        /^\/domain\/?/.test(document.location.pathname)) &&
        !/\/renew\/?/.test(document.location.pathname)

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
        /^\/address\/?/.test(document.location.pathname) &&
        !/\/renew\/?/.test(document.location.pathname)

      if(!reg) {
        return false
      }

      return this.Wallet.wallet &&
        this.Wallet.wallet.account_sale_active
    },

    renewDomain() {
      const renew = !document.location.pathname ||
        document.location.pathname === '/' ||
        /^\/domain\/renew\/?/.test(document.location.pathname)

      if (!renew) {
        return false
      }

      return this.Wallet.wallet &&
              this.Wallet.wallet.domain_sale_active &&
              this.Wallet.wallet.domains.length > 0
    },

    renewAddress() {
      const renew = !document.location.pathname ||
              document.location.pathname === '/' ||
              /^\/address\/renew\/?/.test(document.location.pathname)

      if (!renew) {
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
  max-width: 660px; /* or 950px */
}

#logo {
  width: 300px;
  height: 100px;
}

.public-key-input {
  width: 440px;
}

ul {
  list-style: initial;
}
</style>
