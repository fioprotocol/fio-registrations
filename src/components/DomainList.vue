<template>
  <div>
    <b-form-group>
      <div class="row domain-item" v-bind:key="key" v-for="(item, key) in this.domains">
        <div class="col-md-5">
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
      </div>
    </b-form-group>
  </div>
</template>

<script>

export default {
  name: 'DomainList',

  props: {
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
    }
  },

  watch: {
    //
  },

  computed: {
    //
  }
}
</script>
