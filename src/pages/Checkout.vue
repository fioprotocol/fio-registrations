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
            <b class="select-all"
              >{{checkout.wallet.address}}@{{checkout.wallet.domain}}</b>
          </span>
          <span v-else>
            <b class="select-all">{{checkout.wallet.domain}}</b>
          </span>
          <br/>
          <span class="text-info select-all">{{charge.pricing.local.amount}}</span>&nbsp;
          <span class="text-muted select-all">{{charge.pricing.local.currency}}</span>
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

          <!-- <div v-if="cancelCharge.error" role="alert"
            class="alert alert-danger mt-3"
            >
            {{cancelCharge.error}}
          </div> -->

          <!-- <div class="mt-3">
            <a id="cancel" href="#" class="btn btn-warning wide" @click="cancel">
              Cancel
            </a>
          </div> -->
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
                      <div class="text-info nowrap">{{payment.value.crypto.amount}}</div>
                      <div class="nowrap">{{networkName(payment)}}</div>
                    </th>
                    <td>
                      <div class="text-info nowrap">{{payment.value.local.amount}}</div>
                      <div class="nowrap">{{networkName(payment.value.local.currency)}}</div>
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
              <label for="pay-address">
                <span><img :src="selected.logo"/></span>&nbsp;
                <span>{{selected.name}} Payment Address</span>
              </label>
              <br/>
              <div id="pay-address" aria-describedby="payHelp"
                :class="{['clipboard-left']: !payAddressShow}"
                class="rounded-left border-secondary bg-light border pl-2 pr-2"
              >
                <samp class="pointer"
                  :class="{['text-danger']: expiring || !remaining}"
                  @mousedown="payAddressClick"
                >
                  <span
                    :class="{['select-all']: payAddressEnd === null}"
                  >{{payAddressStart}}</span>
                  <span v-if="payAddressEnd">&hellip;</span>
                  <span v-if="payAddressEnd">{{payAddressEnd}}</span>
                </samp>
              </div>
              <div
                v-if="!payAddressShow"
                class="clipboard-right border-secondary btn btn-sm btn-light mb-1"
                @click="copyAddress"
              >
                &#x1f4cb; <!-- clipboard -->
              </div>

              <div v-if="!remaining">
                <div class="text-danger">
                  &Chi; Expired
                </div>
              </div>

              <small v-if="expiring" class="text-danger">
                Payment address expiring&hellip;
              </small>
              <small v-if="!remaining" class="text-danger">
                Payment address expired.
              </small>
            </div>

            <div class="">
              <label for="pay-amount" class="mt-3">
                <span><img :src="selected.logo"/></span>&nbsp;
                <span>Amount</span>
              </label>
              <br/>
              <div id="pay-amount" aria-describedby="payHelp"
                class="clipboard-left rounded-left border-secondary bg-light border pl-2 pr-2"
              >
                <samp>
                  <span class="select-all">{{payAmount}}</span>
                  &nbsp;
                  <span class="select-all">{{selected.symbol.toUpperCase()}}</span>
                </samp>
              </div>
              <div class="clipboard-right border-secondary btn btn-sm btn-light mb-1"
                @click="copyAmount"
              >
                &#x1f4cb; <!-- clipboard -->
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
import copy from 'clipboard-copy'

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
      paymentQr: null,
      payAddressShow: false
    }
  },

  mixins: [
    ServerMixin('checkout'),
    // ServerMixin('cancelCharge'),
  ],

  created() {
    const {extern_id} = this
    if(!extern_id) {
      return this.$router.push({name: 'home'})
    }

    clearInterval(window.nowInterval) // dev hot load fix
    window.nowInterval = setInterval(() => this.now = Date.now(), 1000)

    clearInterval(window.chargeInterval) // dev hot load fix
    window.chargeInterval = setInterval(() => this.getCharge(), 3000)

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
      return new Date(this.charge.expires_at).getTime()

      // Remaining expiring, expired test cases
      // return new Date().getTime() + (1000 * 60 * 60 * 24) + 4000
      // return new Date().getTime() + (1000 * 60 * 60) + 4000
      // return new Date().getTime() + (1000 * 60) + 4000
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
      const complete = unconf === undefined

      if(complete) {
        clearInterval(window.chargeInterval)
      }

      return complete
    },

    payAddressStart() {
      const {payAddress, payAddressShow} = this

      if(payAddressShow) {
        return payAddress
      }

      if(!payAddress) {
        return null
      }

      if(payAddress.length < 15) {
        return payAddress
      }

      return payAddress.substring(0, 6)
    },

    payAddressEnd() {
      const {payAddress, payAddressShow} = this

      if(payAddressShow) {
        return null
      }

      if(!payAddress) {
        return null
      }

      if(payAddress.length < 15) {
        return null
      }

      return payAddress.substring(payAddress.length - 6, payAddress.length)
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

    copyAmount() {
      copy(this.payAmount)
    },

    copyAddress() {
      copy(this.payAddress)
    },

    payAddressClick() {
      this.payAddressShow = true
      // Vue.nextTick(() => {
      //   console.log(this.$refs.payAddress)
      //   // this.$refs.payAddress.select()
      // })
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

    // cancel() {
    //   const {extern_id} = this
    //
    //   this.$store.dispatch('Server/post', {
    //     key: 'cancelCharge',
    //     path: '/public-api/cancel-charge/' + extern_id
    //   })
    // },

    back() {
      window.history.back()
      this.paymentQr = null
      this.payAddressShow = false

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

    // ['cancelCharge._loading']: function(loading) {
    //   if(loading !== false) { return }
    //
    //   if(this.returnUrl) {
    //     document.location = this.returnUrl
    //     return
    //   }
    //
    //   if(this.cancelCharge.success) {
    //     this.$router.push({name: 'home'})
    //     return
    //   }
    // },

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

.pointer {
  cursor: pointer;
}

.select-all {
  user-select: all;
  cursor: pointer;
}

.clipboard-left {
  float: left;
  width: 238px;
  border-right: none !important;
  height: 29px;
}

.clipboard-right {
  height: 29px;
  border-left: none !important;
  border-top-left-radius: 0rem;
  border-bottom-left-radius: 0rem;
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

.pull-left {
  float: left;
}
</style>
