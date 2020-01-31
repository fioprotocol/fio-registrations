<template>
  <div>
    <div v-if="summaryFiltered.length">
      <slot name="header-if-showing">
      </slot>

      <div v-for="row of summaryFiltered" :key="row['BlockchainEvents.id']">
        <div>
          <span v-if="publicKey">
            <span>
              <b>
                {{accountName(row)}}
              </b>
            </span>
          </span>

          <span v-if="info.paymentInapp">
            <span
              class="link alert-link pointer"
              @click="routerPush(row)"
            >
              {{ status(row) }}
            </span>
          </span>

          <span v-if="!info.paymentInapp">
            <span v-if="!row.forward_url">
              <span>{{ status(row) }}</span>
            </span>

            <span v-if="row.forward_url">
              <a :href="row.forward_url" target="_blank">
                <b>{{ status(row) }}</b>
              </a>
            </span>
          </span>

          <span v-if="isPending(row)">
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
    topActive: Boolean,
    afterTopActive: Boolean,
    refresh: Number,
  },

  beforeCreate() {
    this.uid = uid++
    this.$store.dispatch('Server/init', {
      key: 'summary' + this.uid,
      data: {list: []}
    })
    this.$store.dispatch('AppInfo/load')
  },

  created() {
    this.updateBlockchainTrx()
  },

  computed: {
    ...mapState({
      summary (state) {
        return state.Server['summary' + this.uid]
      },
      info: state => state.AppInfo.info
    }),

    summaryFiltered() {
      const {topActive, afterTopActive, summary} = this

      if(!summary || summary.list.length === 0) {
        return []
      }

      if(!topActive && !afterTopActive) {
        return summary.list
      }

      const isTopActive = this.isPending(summary.list[0])

      if(isTopActive) {
        if(topActive) {
          return summary.list.slice(0, 1)
        } else if(afterTopActive) {
          return summary.list.slice(1, summary.length)
        }
      } else {
        if(topActive) {
          return []
        } else if(afterTopActive) {
          return summary.list
        }
      }
      return summary.list // eslint
    },

    isAnyPending() {
      const found = this.summary &&
        this.summary.list.find(row => this.isPending(row))

      return found !== undefined
    },
  },

  methods: {
    routerPush(row) {
      const {extern_id} = row
      this.$router.push({name: 'checkout', params: {extern_id}})
    },

    status(row) {
      const {trx_status, pay_status} = row

      if(trx_status) {
        if(trx_status === 'pending') { return 'Pending: Awaiting blockchain finality' }
        if(trx_status === 'retry') { return 'Pending: Retrying' }
        if(trx_status === 'success') { return 'Registered' }
        if(trx_status === 'expire') { return 'Failed' }
        if(trx_status === 'cancel') { return 'Cancelled' }
        // leaves: null, review
      }

      if(pay_status) {
        if(pay_status === 'pending') { return 'Pending: Awaiting Payment' }
        if(pay_status === 'success') { return 'Pending: Awaiting blockchain finality' }
        if(pay_status === 'review') { return 'Failed' }
        if(pay_status === 'cancel') { return 'Cancelled' }
      } else {
        if(trx_status === 'review') {
          return 'Failed'
        } else {
          return 'Pending: Awaiting Payment'
        }
      }

      return ''
    },

    isPending(row) {
      if(row.trx_status === null && row.pay_status === 'success') {
        return true
      }

      if(row.trx_status) {
        return /pending|retry/.test(row.trx_status)
      }

      if(row.pay_status) {
        return /pending/.test(row.pay_status)
      }

      return false
    },

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

    accountType(row) {
      return row.address ? 'address' : 'domain'
    },

    accountName(row) {
      return (row.address ? row.address + '@' : '') + row.domain
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
    },

    ['summary._loading']: function(loading) {
      if(loading !== false) { return }

      const found = this.summary &&
        this.summary.list.find(row => this.isPending(row))

      this.$emit('pending', found !== undefined)
    },
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

<style scope>
.pointer {
  cursor: pointer;
}
</style>
