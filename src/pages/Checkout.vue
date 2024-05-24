<template>
  <div id="checkout" class="container-fluid">
    <div v-if="!info.title || !wallet">
      <div class="mb-1 spinner-grow spinner-grow-sm text-light"
      role="status" aria-hidden="true"/>
    </div>
    <div v-else class="card mx-auto mb-5">
      <div class="card-header">
        <div class="mt-4">
          <img :src="wallet.logo_url" id="logo">
          <div class="nowrap mt-4">{{info.title}}</div>
        </div>

        <div class="mt-3" v-if="charge.pricing">
          <span v-if="wallet.address">
            <b class="select-all"
              >{{wallet.address}}@{{wallet.domain}}</b>
          </span>
          <span v-else>
            <b class="select-all">{{wallet.domain}}</b>
          </span>
          <br/>
          <span class="text-info select-all">{{charge.pricing.local.amount}}</span>&nbsp;
          <span class="text-muted select-all">{{charge.pricing.local.currency}}</span>
        </div>
      </div>

      <div v-if="loading">
        <div class="mt-5 mb-5 spinner-border spinner-border"
          role="status" aria-hidden="true"/>
        </div>
      <div v-else class="card-body">
        <div v-if="complete">
          <h5>Payment Complete</h5>
          <div class="check-large text-info">
            &check;
          </div>

          <div class="mt-3">
            <h5>Blockchain {{isRenewal ? (wallet.address ? 'Adding Bundles' : 'Renewal') : 'Registration'}}</h5>
          </div>
          <div class="mt-2 mb-4">
            <TrxMonitor
              :externId="extern_id"
              :address="wallet.address"
              :domain="wallet.domain"
              :publicKey="wallet.owner_key"
              @status="status = $event"
            />
          </div>

          <div v-if="returnUrl">
            <hr/>
            <a :href="returnUrl">Done</a>
          </div>
        </div>

        <div v-if="!complete && detected" class="mt-3">
          <div v-if="paidEnough">
            <h5>Verifying Payment</h5>
          </div>

          <div v-if="!paidEnough">
            <h5>Insufficient Payment</h5>
          </div>

          <div v-if="charge && charge.hosted_url">
            <a :href="charge.hosted_url" target="_blank" rel="noopener noreferrer">
              CHECK PAYMENT STATUS
            </a>
          </div>

          <!-- <small>
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Crypto Price</th>
                  <th scope="col">Local Price</th>
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
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </small> -->
        </div>

        <div v-if="expired" class="container">
          <div class="alert alert-danger" role="alert">
            Expired
          </div>
        </div>

        <div v-if="!complete && !selected && !paidEnough && !expired">
          <div class="card-title mb-3">
            <h5>{{info.title}}</h5>

            <div v-if="charge && charge.hosted_url && !charge.payments.length">
              <button @click="openHostedUrl()" size="sm" style="width: 100px;" class="btn btn-success mt-4" name="pay">
                PAY
              </button>
            </div>
          </div>

          <!-- <p class="card-text">
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
          </ul> -->

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

            <Elapsed
              :expires_at="expire"
              :expiring_at="expiring_at"
              @remaining="remaining = $event"
              @expiring="expiring = $event"
            >
              <template v-slot:suffix>
                Awaiting payment&hellip;
              </template>
            </Elapsed>

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

        <div class="text-left" v-if="paidEnough && !allConfirmed">
          <small>
            Payment collected, your {{wallet.address ? 'address' : 'domain'}}
            will be {{isRenewal ? (wallet.address ? 'replenished' : 'renewed') : 'registered'}}. You may return at any time for an update.
          </small>
        </div>

        <div
          v-if="/^Registered$|^Renewed$|Awaiting blockchain finality/.test(status)"
          class="mb-4 container"
        >
          <div class="alert alert-success" role="alert">
            You can now close this window
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// If updating, you may need to re-test partial and multi-coin payments

import Vue from 'vue'
import {mapState} from 'vuex'
import ServerMixin from '../components/ServerMixin'
import coinName from '../plugins/payment/coinname'
import TrxMonitor from '../components/TrxMonitor'
import Elapsed from '../components/Elapsed'
import '../assets/custom.scss'
import qrcode from 'qrcode'
import copy from 'clipboard-copy'

export default {
  name: 'Checkout',

  props: {
    extern_id: String,
    network: String,
    returnUrl: String,
    accountType: String
  },

  data() {
    return {
      selected: null,
      paymentQr: null,
      payAddressShow: false,
      remaining: true,
      expiring: false,
      status: null
    }
  },

  components: { TrxMonitor, Elapsed },

  mixins: [
    ServerMixin('getWallet'),
    // ServerMixin('cancelCharge'),
  ],

  created() {
    const {extern_id} = this
    if(!extern_id) {
      return this.$router.push({name: 'home'})
    }

    this.$store.dispatch('Server/get', {
      key: 'getWallet',
      path: '/public-api/wallet/' + extern_id,
    })

    clearInterval(window.chargeInterval)
    window.chargeInterval = setInterval(() => this.getCharge(), 3000)

    this.$store.dispatch('AppInfo/load')

    this.getCharge()
    this.setSelectedNetwork()
  },

  beforeDestroy() {
    clearInterval(window.chargeInterval)
    this.$store.dispatch('Payment/reset')
  },

  computed: {
    ...mapState({
      info: state => state.AppInfo.info,
      charge: state => state.Payment.charge
    }),

    isRenewal() {
      return this.accountType === 'renewal'
    },

    loading() {
      if(!this.extern_id) {
        return false
      }

      // Once false this should not go false again to prevent
      // a loop that re-creates the TrxMonitor component.
      if(this.charge.expires_at) {
        return false
      }

      return true
    },

    coinName() {
      return coinName
    },

    wallet() {
      return this.getWallet.wallet
    },

    detected() {
      return this.charge.detected
    },

    expire() {
      // Remaining expiring, expired test cases
      // return new Date().getTime() + (1000 * 60 * 60 * 24) + 4000
      // return new Date().getTime() + (1000 * 60 * 60) + 4000
      // return new Date().getTime() + (1000 * 60) + 4000
      // return new Date().getTime() + (1000) + 4000

      if(!this.charge.expires_at) {
        return
      }

      return new Date(this.charge.expires_at).getTime()
    },

    expired() {
      if(!this.charge.expires_at) {
        return
      }

      if(this.paidEnough) {
        return false
      }

      return Date.now() > this.expire
    },

    expiring_at() {
      if(!this.expire) {
        return
      }

      return this.expire - 60000 // 1 minute
    },

    payAddress() {
      if(!this.charge.addresses) {
        return
      }

      return this.charge.addresses[this.selected.network]
    },

    payAmount() {
      if(!this.charge.pricing) {
        return
      }

      return this.charge.pricing.local.amount
    },

    paidEnough() {
      if(!this.charge.pricing) {
        return
      }

      const price = +Number(this.charge.pricing.local.amount)
      const {payments} = this.charge

      let paid = 0
      payments.forEach(payment => {
        paid += +Number(payment.value.local.amount).toFixed(2)
      })

      return paid >= price
    },

    allConfirmed() {
      if(!this.charge.payments) {
        return
      }

      const {payments} = this.charge
      const unconf = payments.find(payment => !this.isConfirmed(payment))
      const confirmed = unconf === undefined

      if(confirmed && this.paidEnough) {
        clearInterval(window.chargeInterval)
      }

      return confirmed
    },

    complete() {
      return this.allConfirmed && this.paidEnough
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
      this.$store.dispatch('Payment/getCharge', {extern_id} )
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
      this.$router.go(-1)
      this.paymentQr = null
      this.payAddressShow = false

      Vue.nextTick(() => {
        // incase there is nothing in the "back" history
        this.selected = null
      })
    },
    openHostedUrl() {
      window.open(this.charge.hosted_url, '_blank');
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

    ['getWallet._loading']: function(loading) {
      if(loading !== false) { return }

      if(this.getWallet.error) {
        console.error(this.getWallet.error)
        this.$router.push({name: 'home'})
        return
      }
    },

    ['charge._loading']: function(loading) {
      if(loading !== false) { return }

      if(this.charge.error) {
        console.error(this.charge.error)
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
  width: 23rem; /* or 950px */
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
  font-size: 50px;
  position: relative;
  bottom: 25px;
  height: 40px;
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
