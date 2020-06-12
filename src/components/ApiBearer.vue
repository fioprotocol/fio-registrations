<template>
  <div>
    <div>
      <h4>New API Bearer Token (Shared Secret)</h4>
      <div>{{sharedSecret}}</div>

      <br/>
      <small>
        <b>* The API Bearer Token becomes unavailable after your finish.</b>
      </small>
    </div>

    <br />
    <div>
      <b-alert :show="apiUpdateRequest.error" variant="danger" dismissible>
        {{apiUpdateRequest.error}}
      </b-alert>

      <b-alert :show="apiUpdateRequest.success != null" variant="success" dismissible>
        {{apiUpdateRequest.success}}
      </b-alert>

      <SpinnerButton :loading="apiSharedSecret._loading"
        :disabled="!sharedSecret || apiUpdateRequest.success != null"
        @click="onSubmit"
      >
        Save
      </SpinnerButton>
    </div>
  </div>
</template>

<script>
import SpinnerButton from './SpinnerButton'
import ServerMixin from './ServerMixin'

export default {
  name: 'ApiBearer',

  props: {
    walletId: {
      type: Number
    }
  },

  mixins: [
    ServerMixin('apiSharedSecret'),
    ServerMixin('apiUpdateRequest'),
  ],

  components: {
    SpinnerButton
  },

  data() {
    return {
      sharedSecret: null,
    }
  },

  created() {
    if(!this.sharedSecret) {
      this.generateApiSecret()
    }
  },

  methods: {
    generateApiSecret() {
      this.$store.dispatch('Server/get', {
        key: 'apiSharedSecret', path: 'api-generate',
      })
    },

    onSubmit() {
      let path = 'api-update'
      const body = { sharedSecret: this.sharedSecret }
      if (this.walletId) {
        body.walletId = this.walletId
        path = 'wallet-api-update'
      }
      this.$store.dispatch('Server/post', {
        key: 'apiUpdateRequest', path, body
      })
    },
  },

  watch: {
    ['apiSharedSecret._loading']: function(loading) {
      if(!loading) {
        const {sharedSecret} = this.apiSharedSecret.success
        this.sharedSecret = sharedSecret
      }
    },

    ['apiUpdateRequest.success']: function(success) {
      if(success != null) {
        this.$emit('apiUpdated')
        this.showSecret = false
      }
    },
  }
}
</script>
