<template>
  <div>
    <h1>Search</h1>
    <b-form @submit.stop.prevent="onSubmit" class="mb-3">
      <b-form-group id="find-group" label="Search:" label-for="find" type="text">
        <b-form-input id="find" ref="find" v-model="searchInput"
          placeholder="Enter search" required autofocus>
        </b-form-input>
        <small class="text-muted">
          Status:
            <router-link :to="{name: 'find', params: {search: 'review'}}">review</router-link>,
            <router-link :to="{name: 'find', params: {search: 'pending'}}">pending</router-link>,
            <!-- <router-link :to="{name: 'find', params: {search: 'success'}}">success</router-link>, -->
            <router-link :to="{name: 'find', params: {search: 'expire'}}">expire</router-link>,
            <router-link :to="{name: 'find', params: {search: 'retry'}}">retry</router-link>,
            <router-link :to="{name: 'find', params: {search: 'cancel'}}">cancel</router-link>,
            <router-link :to="{name: 'find', params: {search: 'credits'}}">credits</router-link>
          <br/>
          OR Public Key, Address, Domain, Payment Processor ID
        </small>
      </b-form-group>

      <div class="mt-2">
        <b-alert :show="find.error" variant="danger" dismissible>
          {{find.error}}
        </b-alert>
      </div>

      <b-button type="submit" size="sm" style="width: 100px;">
        <span v-if="!find._loading">
          Find
        </span>
        <span class="mb-1 spinner-grow spinner-grow-sm text-light"
          v-else role="status" aria-hidden="true"></span>
      </b-button>
    </b-form>

    <div v-if="isPublicKeySearch && found" class="mb-4">
      <h5>{{submittedSearch}}</h5>

      <b-table stacked bordered
        :fields="['balance']" :items="[{balance: totalBalance}]"
      >
        <template v-slot:cell(balance)="data">
          <Amount :value="-data.value"/>
        </template>
      </b-table>
    </div>

    <paginate
            v-if="found && pagesAmount"
            v-model="urlPage"
            :page-count="pagesAmount"
            :click-handler="setPage"
            :prev-text="'Prev'"
            :next-text="'Next'"
            :container-class="'pagination'"
            :page-link-class="'page-link'"
            :prev-class="'page-link'"
            :next-class="'page-link'"
            :page-class="'page-item'">
    </paginate>

    <div v-if="found">
      <div v-for="type of [
        {
          id: 1, title: 'Addresses', ref: 'address-table',
          items: addresses, fields: accountFields, details
        },
        {
          id: 2, title: 'Domains', ref: 'domain-table',
          items: domains, fields: domainFields, details
        }
      ]" v-bind:key="type.id" >
        <div v-if="type.items.length">
          <h2>{{type.title}}</h2>

          <b-table sticky-header class="account-table"
            :items="type.items" :fields="type.fields" :primary-key="'account_id'"
            :outlined="true" :hover="false" :small="true" :ref="type.ref"
            @row-selected="onRowSelected" selectable select-mode="single"
          >
            <template v-slot:cell(address)="data">
              <span v-if="data.item.address">
                <b>{{data.item.address}}@{{data.item.domain}}</b>
              </span>
              <span v-else>
                <b>{{data.item.domain}}</b>
              </span>
            </template>

            <!-- <template v-slot:cell(balance)="data">
              {{balance(data.item)}}
            </template> -->

            <template v-slot:row-details="row">
              <b-table :items="[row.item]" :stacked="true" :fields="type.details">
                <template v-slot:cell(pending_total)="data">
                  {{row.item.pending_total}}
                  <span v-if="row.item.pay_status !== 'pending'">
                    <span v-if="row.item.pending_total">
                      &nbsp;(<b-link @click="refreshPayment(row.item.extern_id)">refresh</b-link>)
                    </span>
                  </span>
                </template>

                <template v-slot:cell(pay_status_notes)="data">
                  {{data.value}}
                  <span v-if="data.value">&nbsp;&mdash;</span>
                  <div v-if="row.item.pay_created_by">
                    Created by: <b>{{row.item.pay_created_by}}</b>
                  </div>
                </template>

                <template v-slot:cell(trx_status_notes)="data">
                  {{data.value}}
                </template>

                <template v-slot:cell(trx_id)="data">
                  <small class="text-muted">{{data.value}}</small>
                </template>

                <template v-slot:cell(owner_key)="data">
                  <small class="text-muted">
                    <router-link href :to="
                      {name: 'find', params: {search: row.item.owner_key}}
                    ">
                      {{data.value}}
                    </router-link>
                  </small>
                </template>

                <template v-slot:cell(extern_id)="data">
                  <div v-if="data.item.forward_url">
                    <div>
                      <b>{{ data.value }}</b> (<b>
                        <a :href="data.item.forward_url" target="_blank">
                          {{data.item.pay_source}}
                        </a>
                      </b>)
                    </div>
                  </div>
                  <div v-else>
                    <b>{{ data.value }}</b> (<b>{{data.item.pay_source}}</b>)
                  </div>
                </template>

                <template v-slot:cell(metadata)="data">
                  <small class="text-muted">{{data.value}}</small>
                </template>

                <template v-slot:cell(pay_monitor)="data">
                  <small>{{date(data.item.pay_created)}}</small>
                  &nbsp;&mdash;&nbsp;
                  {{data.item.pay_status}}
                  {{data.item.extern_status ? '/' : ''}}
                  {{data.item.extern_status ? data.item.extern_status.toLowerCase() : ''}}
                  <span v-if="data.item.pay_status === 'pending'">
                    &nbsp;(<b-link @click="refreshPayment(data.item.extern_id)">refresh</b-link>)
                  </span>
                </template>

                <template v-slot:cell(trx_monitor)="data">
                  <small>{{date(data.item.trx_created)}}</small>
                  &nbsp;&mdash;&nbsp;
                  {{data.item.trx_status}}
                </template>
              </b-table>

              <div class="row mt-3" v-if="monitorStatus">
                <b-col cols="auto">
                  <TrxMonitor
                    :externId="row.item.extern_id"
                    :address="row.item.address"
                    :domain="row.item.domain"
                    :publicKey="row.item.owner_key"
                    @pending="pending"
                  />
                </b-col>
              </div>

              <div class="row">
                <b-col cols="auto">
                  <b-alert variant="danger" dismissible class="mt-3"
                    :show="serverUpdateTrx(row).error"
                  >
                    {{serverUpdateTrx(row).error}}
                  </b-alert>

                  <b-alert variant="success" dismissible class="mt-3"
                    :show="serverUpdateTrx(row).success != null"
                  >
                    {{serverUpdateTrx(row).success}}
                  </b-alert>
                </b-col>
              </div>

              <div class="row mt-3">
                <b-col cols="auto">
                  <div class="row">
                    <b-col cols="auto" v-if="canRetry(row)">
                      <b-button size="sm" v-b-modal.retry-modal>
                        Retry Registration
                      </b-button>
                      <b-modal id="retry-modal" @ok="updateTrxStatus('retry')"
                        title="Retry Registration"
                      >
                        Register <b>{{account(row.item)}}</b> anyways?
                      </b-modal>
                    </b-col>

                    <b-col cols="auto" v-if="canCancel(row)">
                      <b-button size="sm" v-b-modal.cancel-modal varient="danger">
                        Cancel Registration
                      </b-button>
                      <b-modal id="cancel-modal" @ok="updateTrxStatus('cancel')"
                        title="Cancel" cancel-title="Abort" ok-title="OK, Cancel"
                      >
                        Cancel registration for <b>{{account(row.item)}}</b>?
                        <!-- <span v-if="row.item.trx_status">
                          Remember to credit the customer's balance.
                        </span> -->
                      </b-modal>
                    </b-col>

                    <b-col cols="auto" v-if="/cancel/.test(row.item.trx_status)">
                      <b-button size="sm" v-b-modal.review-modal varient="danger">
                        Undo Cancel
                      </b-button>
                      <b-modal id="review-modal" @ok="updateTrxStatus('review')"
                        title="Undo Cancel"
                      >
                        Move <b>{{account(row.item)}}</b> back into <b>review</b> status?
                      </b-modal>
                    </b-col>
                  </div>
                </b-col>
              </div>
            </template>
          </b-table>
        </div>
      </div>
    </div>
    <div v-if="credits" class="mb-4">
      <b-table
        :fields="['owner_key', 'total']" :items="credits"
      >
        <template v-slot:cell(owner_key)="data">
          <router-link href :to="{name: 'find', params: {search: data.value}}">
            {{pubKeyStart(data.value)}}&hellip;{{pubKeyEnd(data.value)}}
          </router-link>
        </template>

        <template v-slot:cell(total)="data">
          <Amount :value="-data.value"/>
        </template>
      </b-table>
    </div>

    <div v-if="isPublicKeySearch && found" class="mb-4">
      <h2>Transactions</h2>
      <Transactions
        :publicKey="submittedSearch"
        @balance="totalBalance = $event"
        :refresh="refreshTransactions"
      />
    </div>

    <paginate
            v-if="found && pagesAmount"
            v-model="urlPage"
            :page-count="pagesAmount"
            :click-handler="setPage"
            :prev-text="'Prev'"
            :next-text="'Next'"
            :container-class="'pagination'"
            :page-link-class="'page-link'"
            :prev-class="'page-link'"
            :next-class="'page-link'"
            :page-class="'page-item'">
    </paginate>

    <div v-if="notFound">
      <code>No matching results</code>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import {mapState} from 'vuex'
import Paginate from 'vuejs-paginate'
import TrxMonitor from '../components/TrxMonitor.vue'
import Transactions from '../components/Transactions.vue'
import Amount from '../components/Amount.vue'

Vue.component('paginate', Paginate)

export default {
  name: 'Find',

  components: { TrxMonitor, Transactions, Amount },

  props: {
    search: String,
    page: String
  },

  data() {
    return {
      urlPage: 1,
      searchInput: '',
      submittedSearch: '',
      totalBalance: null,
      refreshTransactions: 0,
      accountFields: [
        'address',
        {
          label: 'Purchase Date',
          key: 'pay_created',
          formatter: 'date',
        },
        // {
        //   label: 'Balance',
        //   key: 'balance',
        // },
        {
          label: 'Pay Status',
          key: 'pay_status',
        },
        {
          key: 'trx_status',
          label: 'Registration Status'
        },
      ],

      domainFields: [
        'domain',
        {
          label: 'Purchase Date',
          key: 'pay_created',
          formatter: 'date',
        },
        // {
        //   label: 'Balance',
        //   key: 'balance',
        // },
        {
          label: 'Pay Status',
          key: 'pay_status',
        },
        {
          key: 'trx_status',
        },
      ],

      details: [
        'wallet_name',
        'referral_code',
        'buy_price',
        'confirmed_total',
        'pending_total',
        'pay_status_notes',
        {
          key: 'trx_status_notes',
          label: 'Registration Status Notes'
        },
        'block_num',
        'trx_id',
        'owner_key',
        'extern_id',
        {
          key: 'metadata',
          label: 'Payment Metadata',
        },
        {
          key: 'pay_monitor',
          label: 'Registration Status',
        },
        {
          key: 'trx_monitor',
          label: 'Transaction Status',
        },
      ],

      rowSelect: {
        item: null
      }
    }
  },

  methods: {
    date(value) {
      if(!value) {
        return null
      }

      const d = new Date(value)
      return `${d.toLocaleString()}`
    },

    account(item) {
      return (item.address ? item.address + '@' : '') + item.domain
    },

    // balance(item) {
    //   let bal = item.confirmed_total || 0
    //   if(
    //     item.buy_price !== null &&
    //     item.trx_status !== 'cancel'
    //   ) {
    //     bal -= item.buy_price
    //   }
    //   return Math.round(bal * 100) / 100
    // },

    async updateTrxStatus(new_status) {
      const {account_id} = this.rowSelect.item
      this.$store.dispatch('Server/post', {
        key: 'updateTrx' + account_id,
        path: 'update-trx-status',
        body: {account_id, new_status}
      })

      // this can change the balance
      this.lookup()
    },

    serverUpdateTrx(row) {
      return this.Server['updateTrx' + row.item.account_id] || {}
    },

    onSubmit() {
      if (this.$router.history.current.params.search !== this.searchInput) {
        this.$router.push({ name: 'find', params: { search: this.searchInput, page: '1' }})
      } else {
        this.lookup()
      }
    },

    lookup() {
      this.submittedSearch = this.search
      this.$store.dispatch('Server/get', {
        key: 'find',
        path: 'find/' + encodeURIComponent(this.submittedSearch) + '/' + (this.urlPage || 1)
      })
    },

    refreshRowSelect() {
      this.$store.dispatch('Server/get', {
        key: 'findRefresh',
        path: 'find/' + encodeURIComponent(
          `${this.rowSelect.item.address || ''}@${this.rowSelect.item.domain}`
        )
      })
      this.refreshTransactions = Date.now()
    },

    pending(pending) {
      if( ! pending) {
        this.refreshRowSelect()
      }
    },

    canRetry(row) {
      return (
        row.item.trx_status === null ||
        /expire|review/.test(row.item.trx_status)
      )
    },

    canCancel(row) {
      return (
        row.item.trx_status === null ||
        /expire|review/.test(row.item.trx_status) && (
          row.item.pay_status === null ||
          /review|cancel|success/.test(row.item.pay_status)
        )
      )
    },

    onRowSelected([row]) {
      if(row) {
        if(this.rowSelect.item) {
          this.rowSelect.item._showDetails = false
        }
        Vue.set(this.rowSelect, 'item', row)
        this.rowSelect.item._showDetails = true
      } else {
        this.rowSelect.item._showDetails = false
      }
    },

    refreshPayment(extern_id) {
      this.$store.dispatch('Server/post', {
        key: 'refreshPaymentResult',
        path: 'update-payment/' + extern_id
      })
    },

    pubKeyStart(pubkey) {
      return pubkey.substring(0, 6)
    },

    pubKeyEnd(pubkey) {
      return pubkey.substring(pubkey.length, pubkey.length - 3)
    },

    setPage(pageNum) {
      this.$router.push({ name: 'find', params: { search: this.currentSearch, page: pageNum.toString() } })
    }
  },

  computed: {
    ...mapState({
      find: state => state.Server.find,
      findRefresh: state => state.Server.findRefresh,
      refreshPaymentResult: state => state.Server.refreshPaymentResult,
      Server: state => state.Server,
    }),

    isPublicKeySearch() {
      return /[a-zA-Z0-9]{30,}/.test(this.submittedSearch)
    },

    found() {
      if(this.find._loading) {
        return false
      }

      return this.find.success && this.find.success.length > 0
    },

    notFound() {
      if(this.submittedSearch === '' || this.find._loading) {
        return false
      }

      if(this.find.success) {
        if(this.find.success.length > 0) {
          return false
        }

        if(this.find.success.credits && this.find.success.credits.length > 0) {
          return false
        }
      }

      return true
    },

    addresses() {
      if(!this.find.success) {
        return []
      }
      return this.find.success.filter(row => row.address !== null)
    },

    domains() {
      if(!this.find.success) {
        return []
      }
      return this.find.success.filter(row => row.address === null)
    },

    currentSearch() {
      if (!this.find.success) {
        return ''
      }
      return this.find.search
    },

    pagesAmount() {
      if (!this.find.success) {
        return 0
      }
      return this.find.pages
    },

    credits() {
      if(!this.find.success || !this.find.success.credits) {
        return null
      }
      return this.find.success.credits
    },

    monitorStatus() {
      // console.log('ms', this.rowSelect.item && this.rowSelect.item.pay_status)
      if(!this.rowSelect.item) {
        return false
      }

      return /pending|retry/.test(this.rowSelect.item.pay_status) ||
        /pending|retry/.test(this.rowSelect.item.trx_status) || (
          this.rowSelect.item.pay_status === 'success' &&
          this.rowSelect.item.trx_status === null
        )
    },
  },

  watch: {
    $route(to) {
      this.searchInput = to.params.search
      this.urlPage = parseInt(to.params.page)
      this.lookup()
    },

    ['findRefresh._loading']: function(loading) {
      if (!loading && this.rowSelect.item) {
        const [item] = this.findRefresh.success
        for (var val in item) {
          Vue.set(this.rowSelect.item, val, item[val]) //details
        }
      }
    },

    ['refreshPaymentResult._loading']: function(loading) {
      if(!loading) {
        this.refreshRowSelect()
      }
    },
  },

  created() {
    this.searchInput = this.search
    this.urlPage = parseInt(this.page)
    if (this.search) {
      this.lookup()
    }
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'find'})
  },
}
</script>

<style scope>
.account-table {
  max-height: 900px;
}

.credit {
  color: red;
}

code {
  color: black;
}
</style>
