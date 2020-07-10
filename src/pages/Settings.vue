<template>
  <div>
    <h1>Settings</h1>
    <b-form @submit.stop.prevent="onSubmit" class="mb-3 mt-4">
      <b-button type="submit" size="sm" style="width: 220px;" :disabled="loading">
        <span v-if="!fillRegistrationsSearch._loading">
          Fill Registrations Search
        </span>
        <div v-if="fillRegistrationsSearch._loading"
           class="spinner-grow spinner-grow-sm text-light"
           role="status" aria-hidden="true">
        </div>
      </b-button>
    </b-form>

    <div class="mt-2">
      <b-alert :show="!!alert" variant="success" dismissible>
        {{alert}}
      </b-alert>
    </div>

  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'Settings',

  props: {},

  data() {
    return {
      alert: ''
    }
  },

  methods: {
    onSubmit() {
      this.$store.dispatch('Server/get', {
        key: 'fillRegistrationsSearch',
        path: 'fill-registrations-search'
      })
    },
  },

  computed: {
    ...mapState({
      fillRegistrationsSearch: state => state.Server.fillRegistrationsSearch,
      Server: state => state.Server,
    }),

    loading() {
      return this.fillRegistrationsSearch._loading
    },
  },

  watch: {
    ['fillRegistrationsSearch._loading']: function(loading) {
      if (loading) {
        this.alert = ''
      }
      if (!loading && !this.fillRegistrationsSearch.error && this.fillRegistrationsSearch.success) {
        this.alert = this.fillRegistrationsSearch.success
      }
    },
  },
}
</script>
