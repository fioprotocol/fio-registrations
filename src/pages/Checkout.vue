<template>
  <div id="checkout" class="container-fluid">
    <div v-if="!info.title || !checkout.wallet">
      <div class="mb-1 spinner-grow spinner-grow-sm text-light"
      role="status" aria-hidden="true"/>
    </div>
    <div v-else class="card mx-auto mb-5">
      <div class="card-header">
        <div class="mt-4">
          <img :src="wallet.logo_url" id="logo">
          <div class="nowrap mt-4">{{info.title}}</div>
        </div>

        <div class="mt-3">
          <span v-if="checkout.wallet.address">
            <b>{{checkout.wallet.address}}@{{checkout.wallet.domain}}</b>
          </span>
          <span v-else>
            <b>{{checkout.wallet.domain}}</b>
          </span>
          <br/>
          <span class="text-info">{{charge.pricing.local.amount}}</span>&nbsp;
          <span class="text-muted">{{charge.pricing.local.currency}}</span>
        </div>
      </div>

      <div class="card-body">
        <div v-if="!selected">
          <div class="card-title mb-3">
            <h5>{{info.title}}</h5>
          </div>

          <p class="card-text">
            <small>
              Select a cryptocurrency
            </small>
          </p>

          <ul class="list-group list-group-flush text-left">
            <li class="list-group-item" v-for="coin of coinName" :key="coin.name" >
              <div class="container ml-4" @click="selectCoin(coin)">
                <img :src="coin.logo" @click="selectCoin(coin)"/>
                {{coin.name}}
              </div>
            </li>
          </ul>

          <div v-if="cancelCharge.error" role="alert"
            class="alert alert-danger mt-3"
            >
            {{cancelCharge.error}}
          </div>

          <div class="mt-3">
            <a id="cancel" href="#" class="btn btn-warning wide" @click="cancel">
              Cancel
            </a>
          </div>
        </div>

        <div v-if="selected">
          <!-- <div class="text-center">
            <img :src="selected.logo"/>
          </div> -->

          <div v-if="allConfirmed && paidEnough">
            <h5>Payment Complete</h5>
            <div class="check-large text-info">
              &check;
            </div>

            <h5>Registration</h5>
            <div class="mt-2 mb-4">
              <TrxMonitor
                topActive
                :publicKey="wallet.owner_key"
                :referral="wallet.referral_code"
              />
            </div>

            <div v-if="returnUrl">
              <hr/>
              <a :href="returnUrl">Done</a>
            </div>
          </div>

          <div v-if="(!paidEnough || !allConfirmed) && detected" class="mt-3">
            <div v-if="paidEnough">
              <h5>Verifying Payment</h5>
            </div>

            <div v-if="!paidEnough">
              <h5>Insufficient Payment</h5>
            </div>

            <small>
              <table class="table">
                <thead>
                  <tr>
                    <th scope="col">Crypto</th>
                    <th scope="col">Local</th>
                    <th scope="col">Verify</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(payment, i) in charge.payments" :key="i">
                    <th scope="row">
                      <span class="text-info">{{payment.value.crypto.amount}}</span>&nbsp;
                      {{networkName(payment)}}
                    </th>
                    <td>
                      <span class="text-info">{{payment.value.local.amount}}</span>&nbsp;
                      {{networkName(payment.value.local.currency)}}
                    </td>
                    <td>
                      <div v-if="isConfirmed(payment)" class="check-medium text-dark">
                        &check;
                      </div>
                      <div v-else class="nowrap">
                        <span class="text-info">{{payment.confirmations}}</span> of
                        <span class="text-info">{{payment.confirmations_required}}</span>
                        <br/>
                        <!-- <div
                          class="mb-1 spinner-border spinner-border-sm text-dark"
                          role="status" aria-hidden="true"
                        ></div> -->
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </small>
          </div>

          <div class="text-left" v-if="!paidEnough">
            <div class="mt-3">
              <label for="payAddress">
                <span><img :src="selected.logo"/></span>&nbsp;
                <span>{{selected.name}} Payment Address</span>
              </label>

              <div id="payAddress" aria-describedby="payHelp"
                class="rounded-lg border-secondary bg-light border pl-2 pr-2"
              >
                <div v-if="remaining">
                  <samp :class="{['text-danger']: expiring}">{{payAddress}}</samp>
                </div>
                <div v-if="!remaining">
                  <samp class="text-danger">{{payAddress}}</samp>
                  <div class="text-danger">
                    &Chi; Expired
                  </div>
                </div>
              </div>
              <small v-if="expiring" class="text-danger">
                Payment address expiring&hellip;
              </small>
              <small v-if="!remaining" class="text-danger">
                Payment address expired.
              </small>
            </div>

            <div class="mt-3">
              <label for="payAmount">
                <span><img :src="selected.logo"/></span>&nbsp;
                <span>Amount</span>
              </label>

              <div id="payAmount" aria-describedby="payHelp"
                class="rounded-lg border-secondary bg-light border pl-2 pr-2"
              >
                <samp>{{payAmount}} {{selected.symbol.toUpperCase()}}</samp>
              </div>
            </div>

            <div v-if="remaining">
              <small>
                <span v-if="hours">{{hours}}:</span>
                <span>{{minutes}}:</span>
                <span>{{seconds}}</span>
                Awaiting payment&hellip;
              </small>
            </div>

            <div v-if="!paymentQr && selected.qrdata" class="text-center">
              <div class="btn btn-light mt-3" @click="updatePaymentQr">
                Show QR Code
              </div>
            </div>
            <div v-if="paymentQr" class="text-center">
              <img :src="paymentQr" />
            </div>

            <hr/>
            <div class="mt-3 text-left">
              <a id="back" href="#" class="btn btn-light" @click="back">
                &lt;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import {mapState} from 'vuex'
import ServerMixin from '../components/ServerMixin'
import coinName from '../plugins/payment/coinname'
import TrxMonitor from '../components/TrxMonitor'
import '../assets/custom.scss'
import qrcode from 'qrcode'

export default {
  name: 'Checkout',

  props: {
    extern_id: String,
    network: String,
    returnUrl: String
  },

  data() {
    return {
      selected: null,
      now: Date.now(),
      paymentQr: null
    }
  },

  mixins: [
    ServerMixin('checkout'),
    ServerMixin('cancelCharge'),
  ],

  created() {
    const {extern_id} = this
    if(!extern_id) {
      return this.$router.push({name: 'home'})
    }

    clearInterval(window.nowInterval) // dev hot load fix
    window.nowInterval = setInterval(() => this.now = Date.now(), 1000)

    clearInterval(window.chargeInterval) // dev hot load fix
    window.chargeInterval = setInterval(() => this.getCharge(), 6000)

    this.$store.dispatch('AppInfo/load')
    this.getCharge()
    this.setSelectedNetwork()
  },

  components: { TrxMonitor },

  computed: {
    ...mapState({
      info: state => state.AppInfo.info
    }),

    coinName() {
      return coinName
    },

    charge() {
      return this.checkout.charge
    },

    wallet() {
      return this.checkout.wallet
    },

    expire() {
      // return new Date(this.charge.expires_at).getTime()

      // Remaining expiring, expired test cases
      // return new Date().getTime() + (1000 * 60 * 60 * 24) + 4000
      // return new Date().getTime() + (1000 * 60 * 60) + 4000
      return new Date().getTime() + (1000 * 60) + 4000
      // return new Date().getTime() + (1000) + 4000
    },

    detected() {
      return this.charge.detected
    },

    remaining() {
      if(!this.charge.expires_at) {
        return true
      }

      return this.now < this.expire
    },

    expiring() {
      return this.remaining && this.hours === 0 && Number(this.minutes) === 0
    },

    hours() {
      const seconds = Math.round((this.expire - this.now) / 1000)
      const val = Math.floor(seconds / (60 * 60))
      return val
    },

    minutes() {
      const seconds = Math.round((this.expire - this.now) / 1000)
      const val = Math.floor((seconds / 60) % 60)
      return `${val < 10 ? '0' : ''}${val}`
    },

    seconds() {
      const seconds = Math.round((this.expire - this.now) / 1000)
      const val = seconds % 60
      return `${val < 10 ? '0' : ''}${val}`
    },

    payAddress() {
      return this.charge.addresses[this.selected.network]
    },

    payAmount() {
      return this.charge.pricing[this.selected.network].amount
    },

    paidEnough() {
      const price = +this.charge.pricing.local.amount
      const {payments} = this.charge || []

      let paid = 0
      payments.forEach(payment => {
        paid += Math.round( +payment.value.local.amount * 100) / 100
      })

      return paid >= price
    },

    allConfirmed() {
      const {payments} = this.charge || []
      const unconf = payments.find(payment => !this.isConfirmed(payment))
      return unconf === undefined
    },

    payAddressShort() {
      const {payAddress} = this
      if(!payAddress) {
        return null
      }

      if(payAddress.length < 15) {
        return payAddress
      }

      return payAddress.substring(0, 6) + '..' +
        payAddress.substring(payAddress.length - 7, payAddress.length - 1)
    }
  },

  methods: {
    getCharge() {
      const {extern_id} = this

      this.$store.dispatch('Server/get', {
        key: 'checkout',
        path: '/public-api/charge/' + extern_id
      })
    },

    selectCoin(coin) {
      this.$router.push({name: 'checkout', params: {
        extern_id: this.extern_id,
        network: coin.network
      }})
    },

    setSelectedNetwork() {
      const {network} = this

      if(!network) {
        this.selected = null
        return
      }

      const coin = coinName.find(coin => coin.network === network)
      if(!coin) {
        this.selected = null
        return
      }

      this.selected = coin
    },

    networkName(payment) {
      if(typeof payment === 'object') {
        payment = payment.network
      }

      const key = payment.toLowerCase()
      const network = coinName.find(coin => coin.network === key)
      if(network) {
        return network.name
      }
      return ''
    },

    isConfirmed(payment) {
      return payment.confirmations >= payment.confirmations_required
    },

    async updatePaymentQr() {
      const {payAddress, payAmount} = this
      const {qrdata} = this.selected
      const data = qrdata(payAddress, payAmount)
      this.paymentQr = await qrcode.toDataURL(data)
    },

    cancel() {
      const {extern_id} = this

      this.$store.dispatch('Server/post', {
        key: 'cancelCharge',
        path: '/public-api/cancel-charge/' + extern_id
      })
    },

    back() {
      window.history.back()
      this.paymentQr = null
      Vue.nextTick(() => {
        // incase there is nothing in the "back" history
        this.selected = null
      })
    }
  },

  watch: {
    network: function() {
      this.setSelectedNetwork()
    },

    ['cancelCharge._loading']: function(loading) {
      if(loading !== false) { return }

      if(this.returnUrl) {
        document.location = this.returnUrl
        return
      }

      if(this.cancelCharge.success) {
        this.$router.push({name: 'home'})
        return
      }
    },

    ['checkout._loading']: function(loading) {
      if(loading !== false) { return }

      if(this.checkout.error) {
        console.error(this.checkout.error)
        this.$router.push({name: 'home'})
        return
      }
    },
  }
}
</script>

<style scope>
#checkout {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0 auto;
  margin-top: 60px;
  width: 22rem; /* or 950px */
}

#logo {
  width: 150px;
  height: 50px;
}

.check-large {
  font-size: 100px;
  position: relative;
  bottom: 50px;
  height: 80px;
}

.check-medium {
  font-size: 25px;
}

.nowrap {
  white-space: nowrap;
}

.wide {
  width: 250px;
}
</style>
