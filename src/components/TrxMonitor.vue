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
          <span v-else>
            <span v-if="isPending(row)">
              &nbsp;
              <span class="mb-1 spinner-grow spinner-grow-sm"
              role="status" aria-hidden="true"></span>
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'

// used for a summary per account
let uid = 0

export default {
  name: 'TrxMonitor',
  props: {
    publicKey: String,
    referralCode: String,
    address: String,
    domain: String,
    externId: String,
    type: String,
    accountPayId: Number,
    topActive: Boolean,
    afterTopActive: Boolean,
    refresh: Number,
  },

  data() {
    return {
      expireAtCache: {},
      uid: ''
    }
  },

  beforeCreate() {
    this.$store.dispatch('AppInfo/load')

    this.$store.dispatch('Server/init', {
      key: 'fio_chain_info',
      data: {}
    })

  },

  created() {
    this.uid = this.generateUid()
    this.$store.dispatch('Server/init', {
      key: 'summary' + this.uid,
      data: {list: []}
    })

    this.updateBlockchainTrx()
  },

  computed: {
    ...mapState({
      summary (state) {
        return state.Server['summary' + this.uid]
      },
      info: state => state.AppInfo.info,
      fio_chain_info: state => state.Server.fio_chain_info
    }),

    summaryFiltered() {
      const {topActive, afterTopActive, summary} = this

      if(!summary || !summary.list || summary.list.length === 0) {
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

      return summary.list // eslint needed dead code
    },

    isAnyPending() {
      const found = this.summaryFiltered.find(row => this.isPending(row))
      return found !== undefined
    },
  },

  methods: {
    routerPush(row) {
      const {extern_id} = row
      if(extern_id !== null) {
        this.$router.push({name: 'checkout', params: {extern_id}})
      }
    },

    status(row) {
      let ret
      try {
        const {trx_status, pay_status, trx_type} = row

        const successLabel = { 'renew': 'Renewed', 'register': 'Registered', 'add_bundles': 'Bundles Added' }

        if(trx_status) {
          if(trx_status === 'pending') { return ret = 'Created' }
          if(trx_status === 'retry') { return ret = 'Pending: Retrying' }
          if(trx_status === 'success') { return ret = successLabel[trx_type] || 'Registered' }
          if(trx_status === 'expire') { return ret = 'Failed' }
          if(trx_status === 'cancel') { return ret = 'Cancelled' }
          if(pay_status === 'success' && trx_status === 'review') {
            return ret = 'Failed'
          }
          // leaves: null
        }

        if(pay_status) {
          if(pay_status === 'success') { return ret = 'Pending: Registering on blockchain' }
          if(pay_status === 'review') { return ret = 'Failed' }
          if(pay_status === 'cancel') { return ret = 'Cancelled' }
        } else {
          if(trx_status === 'review') {
            return ret = 'Failed'
          }
        }

        return ret = null

      } finally {
        this.$emit('status', ret)
      }
    },

    isPending(row) {
      if(row.trx_status === null && row.pay_status === 'success') {
        return true
      }

      if(row.trx_status) {
        return /retry/.test(row.trx_status)
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
          domain: this.domain,
          type: this.type,
          accountPayId: this.accountPayId,
          externId: this.externId
        }
      })
    },

    expiresAt(row) {
      if(this.expireAtCache[row.block_num]) {
        return this.expireAtCache[row.block_num]
      }

      if( ! this.fio_chain_info.last_irreversible_block_num) {
        return
      }

      const lib = this.fio_chain_info.last_irreversible_block_num
      const {block_num} = row

      const blockTimeMs = 500
      // Block producers create 12 blocks in a row
      const blockProducerTime = 12 * blockTimeMs
      const expireAt = Date.now() + ((block_num - lib) * blockTimeMs) + blockProducerTime
      this.expireAtCache[row.block_num] = expireAt
      return expireAt
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

    generateUid() {
      const perAccount = this.domain !== undefined
      return perAccount ? ++uid : ''
    }
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

      const found = this.summaryFiltered.find(row => this.isPending(row))

      this.$emit('pending', found !== undefined)

      const trxPending = this.summaryFiltered.find(
        row => row.trx_status === 'pending')

      // only grab this once, or the counter jumps around
      if(trxPending && this.expireAtCache[trxPending.block_num] === undefined) {
        // for estimating irreversibility
        this.$store.dispatch('Server/get', {
          api: 'fio', key: 'fio_chain_info',
          path: '/get_info',
        })
      }
    },
  },

  beforeDestroy () {
    clearInterval(this['polling' + this.uid])
    delete this['polling' + this.uid]

    this.$store.dispatch('Server/clear', {
      key: 'summary' + this.uid
    })

    this.$emit('status', null)
  }
}
</script>

<style scope>
.pointer {
  cursor: pointer;
}
</style>
