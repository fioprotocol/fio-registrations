<template>
  <div>
    <div>
      <!-- @row-selected="onRowSelected" -->
      <b-table
        :items="wallets.list"
        primary-key="id"
        :fields="fields"
        select-mode="single"
        :selectable="true"
        :striped="false"
        :bordered="false"
        :borderless="false"
        :outlined="true"
        :small="true"
        :hover="true"
        :dark="false"
        :fixed="false"
        :foot-clone="false"
        :no-border-collapse="true"
        :head-variant="null"
        :table-variant="''"
        @row-clicked="editRow"
      >
        <template v-slot:cell(domains)="data">
          {{data.item.domains.join(', ')}}
        </template>
      </b-table>

      <div class="row" :hidden="wallets._loading">
        <b-col cols="auto">
          <b-button size="sm" :to="{name: 'wallet'}"
            :disabled="rowsSelect.length !== 0"
          >
            Add new Wallet
          </b-button>
        </b-col>

        <b-col cols="auto" class="ml-auto">
          <small class="text-muted">Click Row to Edit</small>
        </b-col>
      </div>
    </div>
  </div>
</template>

<script>
import {mapState} from 'vuex'

export default {
  name: 'Wallets',

  data() {
    return {
      fields: [
        {
          key: 'name',
          label: 'Name'
        },
        {
          key: 'referral_code',
        },
        {
          key: 'domains',
        },
      ],
      rowsSelect: []
    }
  },

  methods: {
    // onRowSelected(items) {
    //   this.rowsSelect = items.map(i => i.referral_code)
    // },

    editRow(row) {
      this.$router.push({
        name: 'wallet', params: {referralCode: row.referral_code}
      })
    },
  },

  watch: {
    // ['wallets._loading']: function(loading) {
    //   if(!loading) {
    //     if(this.username === this.rowsSelect[0].name) {
    //       this.$route.push({name: 'login'})
    //     } else {
    //       this.$store.dispatch('Server/get', {key: 'users'})
    //     }
    //   }
    // },
  },

  computed: {
    isSelected() {
      return this.rowsSelect.length === 1
    },

    referralCode() {
      return this.rowsSelect.length === 1 ? this.rowsSelect[0] : null
    },

    ...mapState({
      wallets: state => state.Server.wallets,
    }),
  },

  created() {
    this.$store.dispatch('Server/get', {key: 'wallets'})
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'wallets'})
  },
}
</script>
