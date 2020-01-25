<template>
  <div>
    <form @submit.prevent="checkKey">
      <div class="input-group">
        <input
          type="text"
          class="public-key-input"
          name="registrationPublicKey"
          placeholder="Enter public key"
          v-model="publicKeyEntry"
          autofocus
          required
        />
        <span class="input-group-btn mt-2">
          <button class="btn btn-info" type="submit">
            <div v-if="validPublicKey">
              Check &mdash; Valid!
            </div>
            <div v-else>
              Check
            </div>
          </button>
        </span>
      </div>
    </form>

    <div v-if="publicKeyEntry === invalidKey" class="mt-3">
      <div class="alert alert-danger mt-3" role="alert">
        Invalid public key
      </div>
    </div>
  </div>
</template>

<script>
import ServerMixin from './ServerMixin'

export default {
  name: 'PublicKey',

  mixins: [
    ServerMixin('checkPublicKey'),
  ],

  data() {
    return {
      publicKeyEntry: '',
      invalidKey: false,
      validPublicKey: null
    }
  },

  methods: {
    checkKey() {
      this.$store.dispatch('Server/get', {
        key: 'checkPublicKey',
        path: '/public-api/check-public-key/' + this.publicKeyEntry
      })
    }
  },

  watch: {
    ['checkPublicKey._loading']: function(loading) {
      if(!loading) {
        this.validPublicKey = this.checkPublicKey.success
        if(this.validPublicKey === false) {
          this.invalidKey = this.publicKeyEntry
        } else {
          this.$emit('valid', this.publicKeyEntry)
        }
      }
    }
  }
}
</script>
