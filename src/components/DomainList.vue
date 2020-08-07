<template>
  <div>
    <b-form-group>
      <div class="row domain-item" v-bind:key="key" v-for="(item, key) in this.domains">
        <div class="col-md-4">
          <b-form-input id="domain-limit"
                        required
                        v-model="item.domain"
                        type="text" step="1" min="1"
                        placeholder="domain"
          >
          </b-form-input>
        </div>
        <div class="col-md-3 align-items-center">
          <span class="small">Limit: </span>
          <b-form-input id="domain-limit"
                        class="d-inline-block w-75"
                        v-model="item.limit"
                        type="number" step="1" min="1"
                        placeholder="unlimited"
          >
          </b-form-input>
        </div>
        <div class="col-md-2 d-flex align-items-center small">
          Registered: {{ item.registered || '-' }}
        </div>
        <div class="col-md-2 d-flex align-items-center justify-content-end">
          <b-button size="sm" @click="() => handleRemoveDomain(item.domain, key)" variant="danger">
            Remove
          </b-button>
        </div>
        <div class="col-md-1 d-flex align-items-center justify-content-end">
          <date-picker class="date-input" :input-class="'w-100 d-none'" v-on:change="downloadCsvReport(item.domain, $event)">CSV</date-picker>
        </div>
      </div>
    </b-form-group>
  </div>
</template>

<script>

import {mapState} from "vuex";
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';

export default {
  name: 'DomainList',

  components: {
    DatePicker
  },

  props: {
    referralCode: String,
    domains: Array,
    removeDomain: Function
  },

  methods: {
    handleRemoveDomain(domain, key) {
      if (domain) {
        const result = confirm(`Are you sure you want remove ${domain} domain?`)
        if (!result) return
      }
      this.removeDomain(key)
    },
    downloadCsvReport(domain, date) {
      this.$store.dispatch('Server/get', {
        key: 'csvReport',
        path: `csv-report?ref=${this.referralCode}&domain=${domain}&after=${new Date(date).toISOString()}`
      })
    }
  },

  watch: {
    ['csvReport._loading']: function(loading) {
      if (loading) {
        this.alert = ''
      }
      if (!loading && !this.csvReport.error && this.csvReport.success) {
        window.open(`/uploads/${this.csvReport.success.filePath}`, '_blank');
      }
    },
  },

  computed: {
    ...mapState({
      csvReport: state => state.Server.csvReport,
      Server: state => state.Server,
    }),

    csvLoading() {
      return this.csvReport && this.csvReport._loading
    },
  }
}
</script>

<style scoped>
  .date-input {
    cursor: pointer;
    background-color: #fafafa;
  }
</style>
