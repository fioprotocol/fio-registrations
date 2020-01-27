<template>
  <div>
    <b-table bordered sticky-header
      v-if="transactions.success"
      :fields="fields" :items="transactions.success"
    >
    <template v-slot:cell(total)="data">
      <Amount :value="round(data.value)"/>
    </template>

    <template v-slot:cell(balance)="data">
      <Amount :value="data.value"/>
    </template>

    <template v-slot:cell(type)="data">
      {{capitalType(data.value)}}
      <span v-if="data.item.created_by">
        by <b>{{data.item.created_by}}</b>:
      </span>
      &nbsp;
      <b>{{address(data.item.address, data.item.domain)}}</b>
      {{externId(data.item.extern_id)}}
      <span v-if="data.item.notes">
        &nbsp;{{data.item.notes}}
      </span>
    </template>
    </b-table>

    <b-link v-b-modal.adj-modal>
      Add Transaction Manually
    </b-link>
    <b-modal id="adj-modal" ok-only ok-title="Close"
      title="Add Transaction Manually"
    >
      <AccountAdjEntry :publicKey="publicKey" @update="adjUpdate" />
    </b-modal>
  </div>
</template>

<script>
import ServerMixin from './ServerMixin'
import AccountAdjEntry from './AccountAdjEntry'
import Amount from './Amount'

export default {
  name: 'Transactions',

  props: {
    publicKey: String,
    refresh: Number
  },

  components: {
    AccountAdjEntry,
    Amount
  },

  data() {
    return {
      fields: [
        {
          key: 'created',
          label: 'Date',
          formatter: 'date',
        },
        {
          key: 'total',
          label: 'Amount',
        },
        'balance',
        {
          key: 'type',
          label: 'Description',
        },
      ],
    }
  },

  mixins: [ServerMixin('transactions')],

  created() {
    this.getTransactions()
  },

  watch: {
    ['transactions._loading']: function(loading) {
      if(loading !== false) { return }
      let balance = 0
      this.transactions.success.forEach(t => {
        t.balance = this.round(balance += Number(t.total))
      })
      this.$emit('balance', this.round(balance))
    },

    refresh() {
      this.getTransactions()
    }
  },

  methods: {
    getTransactions() {
      const {publicKey} = this
      this.$store.dispatch('Server/get', {
        key: 'transactions', path: 'transactions/' + publicKey,
      })
    },

    adjUpdate() {
      this.getTransactions()
    },

    date(value) {
      if(!value) {
        return null
      }
      const d = new Date(value)
      return d.toLocaleString()
    },

    round(value) {
      if(value == null) {
        return null
      }
      return Math.round(value * 100) / 100
    },

    capitalType(value) {
      return value.substring(0, 1).toUpperCase() +
        value.substring(1, value.length)
    },

    address(address, domain) {
      if(!domain) {
        return address
      }
      return `${address}@${domain}`
    },

    externId(value) {
      if(!value) {
        return null
      }
      if(value.length < 15) {
        return value
      }
      // Blockchain transaction ID
      return value.substring(0, 6) + '..' +
        value.substring(value.length - 6, value.length)
    }
  }
}
</script>
