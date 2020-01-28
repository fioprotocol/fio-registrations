<template>
  <div>
    <div v-if="summaryFiltered.length">
      <slot name="header-if-showing">
      </slot>

      <div v-for="trx of summaryFiltered" :key="trx['BlockchainEvents.id']">
        <div>
          <b>{{accountName(trx)}}</b>

          <span v-if="trx.trx_status === null">
            payment
            <span v-if="trx.forward_url">
              <a :href="trx.forward_url" target="_blank"><b>{{pay_status(trx)}}</b></a>
            </span>
            <span v-else>
              <b>{{pay_status(trx)}}</b>
            </span>
            <span v-if="trx.pay_status_notes">
              {{trx.pay_status_notes}}
            </span>
          </span>

          <span v-if="trx.trx_status !== null">
            blockchain registration <b>{{trx.trx_status}}</b>
          </span>

          <span v-if="isPending(trx)">
            &nbsp;
            <span class="mb-1 spinner-grow spinner-grow-sm"
            role="status" aria-hidden="true"></span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'

// allows for a summary per account
let uid = 1

export default {
  name: 'TrxMonitor',
  props: {
    publicKey: String,
    referralCode: String,
    address: String,
    domain: String,
    topActive: Number,
    afterTopActive: Number,
    refresh: Number,
  },

  beforeCreate() {
    this.uid = uid++
    this.$store.dispatch('Server/init', {
      key: 'summary' + this.uid,
      data: {list: []}
    })
  },

  created() {
    this.updateBlockchainTrx()
  },

  computed: {
    ...mapState({
      summary (state) {
        return state.Server['summary' + this.uid]
      },
    }),

    summaryFiltered() {
      const {topActive, afterTopActive, summary} = this

      if(!topActive && !afterTopActive) {
        return summary.list
      }

      if(topActive) {
        return summary.list.slice(0, topActive)
      }

      return summary.list.slice(afterTopActive, summary.length)
    },

    isAnyPending() {
      const found = this.summary &&
        this.summary.list.find(trx => this.isPending(trx))

      return found !== undefined
    },
  },

  methods: {
    updateBlockchainTrx() {
      if(!this.publicKey && !this.domain) {
        return
      }

      this.$store.dispatch('Server/post', {
        key: 'summary' + this.uid,
        path: '/public-api/summary',
        body: {
          referralCode: this.referralCode,
          publicKey: this.publicKey,
          address: this.address,
          domain: this.domain
        }
      })
    },

    pay_status(trx) {
      const {pay_status, extern_status} = trx
      if(extern_status) {
        return extern_status.toLowerCase()
      }
      return pay_status.toLowerCase()
    },

    isPending(trx) {
      if(trx.trx_status === null && trx.pay_status === 'success') {
        return true
      }

      if(trx.trx_status) {
        return /pending|retry/.test(trx.trx_status)
      }

      if(trx.pay_status) {
        return /pending/.test(trx.pay_status)
      }

      return false
    },

    accountType(trx) {
      return trx.address ? 'address' : 'domain'
    },

    accountName(trx) {
      return (trx.address ? trx.address + '@' : '') + trx.domain
    },

    poll() {
      clearInterval(this['polling' + this.uid])
      this['polling' + this.uid] = setInterval(() => {this.updateBlockchainTrx()}, 2500)
    },
  },

  watch: {
    isAnyPending(pending) {
      if(pending) {
        this.poll()
      } else {
        clearInterval(this['polling' + this.uid])
      }
      this.$emit('pending', pending)
    },

    refresh() {
      this.updateBlockchainTrx()
    }
  },

  beforeDestroy () {
    clearInterval(this['polling' + this.uid])
    delete this['polling' + this.uid]

    this.$store.dispatch('Server/clear', {
      key: 'summary' + this.uid
    })
  }
}
</script>
