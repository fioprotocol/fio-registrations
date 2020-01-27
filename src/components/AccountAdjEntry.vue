<template>
  <div>
    <b-form @submit.prevent="addAdjustment">
      <b-form-group>
        <b-form-radio-group id="debit-credit-select"
          v-model="entryType" name="entryType" required
        >
          <b-form-radio value="debit">
            Debit
          </b-form-radio>
          <b-form-radio value="credit">
            Credit
          </b-form-radio>
        </b-form-radio-group>
      </b-form-group>

      <b-form-group
        description="USD / USDC"
      >
        <b-form-input
          type="number" min="0.01" step="0.01"
          class="adjustment-input"
          autocomplete="new-password"
          placeholder="Amount"
          v-model="inputAmount"
          autofocus required
        />
      </b-form-group>

      <b-form-group>
        <b-form-input
          type="text"
          class="description-input"
          placeholder="Description"
          v-model="notes"
          required
        />
      </b-form-group>

      <div class="mt-2">
        <b-button type="submit">
          Add
        </b-button>
      </div>

      <b-alert v-if="adjustment.success" class="mt-2" varient="info" dismissible show>
        Created {{entryType.toUpperCase()}} adjustment {{inputAmount}}
      </b-alert>

      <b-alert v-if="adjustment.error" class="mt-2" varient="danger" dismissible show>
        {{adjustment.error}}
      </b-alert>
    </b-form>
  </div>
</template>

<script>
import ServerMixin from './ServerMixin'

export default {
  name: 'AccountAdjEntry',

  props: {
    publicKey: {
      type: String,
      required: true
    }
  },

  mixins: [ServerMixin('adjustment')],

  data() {
    return {
      entryType: null,
      inputAmount: null,
      notes: null,
    }
  },

  methods: {
    addAdjustment() {
      const {publicKey, entryType, inputAmount, notes} = this
      const amount = entryType === 'credit' ? -1 * inputAmount : inputAmount
      this.$store.dispatch('Server/post', {
        key: 'adjustment', path: '/adjustment',
        body: {publicKey, amount, notes}
      })
    }
  },

  watch: {
    ['adjustment._loading']: function(loading) {
      if(loading !== false) { return }
      this.$emit('update')
    }
  },
}
</script>
