<template>
  <div>
    <div v-if="sharedSecret">
      <h4>Webhook Shared Secret</h4>
      <div>{{sharedSecretMasked}}</div>

      <br />

      <b-button @click="rotate">
        Rotate
      </b-button>
      &nbsp; &nbsp;
      <b-button @click="showSecret = !showSecret">
        {{showSecret ? 'Hide' : 'Show'}}
      </b-button>
    </div>

    <br />
    <h4>Enable</h4>

    <b-form-group description="Enabled Events">
      <b-table
        :fields="['payment', 'blockchain']"
        :items="[{
          payment: ['pending', 'success', 'review', 'cancel'],
          blockchain: ['pending', 'retry', 'success', 'expire', 'review', 'cancel']
        }]"
      >
        <template v-slot:cell(payment)="data">
          <b-form-group>
            <b-form-checkbox-group
              v-model="payEventModel"
              :options="data.item.payment"
            ></b-form-checkbox-group>
          </b-form-group>
        </template>
        <template v-slot:cell(blockchain)="data">
          <b-form-group>
            <b-form-checkbox-group
              v-model="trxEventModel"
              :options="data.item.blockchain"
            ></b-form-checkbox-group>
          </b-form-group>
        </template>
      </b-table>
    </b-form-group>

    <br />

    <b-form @submit.stop.prevent="onSubmit">
      <h4>Test</h4>

      <b-form-group description="Test your webhook with these events">
        <b-form-select v-model="selected" :options="webhookTests.list"></b-form-select>
      </b-form-group>

      <SpinnerButton :loading="webhookTest._loading" :disabled="selected === null">
        Send
      </SpinnerButton>

      <div class="mb-3"></div>

      <b-alert :show="webhookTest.error != null" variant="danger" dismissible>
        {{webhookTest.error}}
      </b-alert>

      <div v-if="webhookTest.success && selected === request.event">
        <h4>Request</h4>
        <b-table :fields="Object.keys(request)" :items="[request]" stacked></b-table>
        <!-- <b-table :fields="Object.keys(webhookTest.headers)"
          :items="[webhookTest.headers]" stacked></b-table> -->

        <h4>Response</h4>
        <b-table :fields="Object.keys(webhookTest.response)"
          :items="[webhookTest.response]" stacked></b-table>
      </div>
    </b-form>
  </div>
</template>

<script>
import SpinnerButton from './SpinnerButton'
import ServerMixin from './ServerMixin'

export default {
  name: 'WebhookProperties',

  mixins: [
    ServerMixin('webhookSharedSecret'),
    ServerMixin('webhookTest'),
    ServerMixin('webhookTests', {initialState: {list: []}}),
  ],

  components: {
    SpinnerButton
  },

  props: {
    endpoint: String,
    sharedSecret: String,
    payEvents: Array,
    trxEvents: Array,
  },

  data() {
    return {
      selected: null,
      request: null,
      showSecret: false,
    }
  },

  created() {
    if(!this.sharedSecret) {
      this.generateSharedSecret()
    }
    this.$store.dispatch('Server/get', {
      key: 'webhookTests', path: 'webhook-tests'
    })
  },

  methods: {
    rotate() {
      this.generateSharedSecret()
    },

    generateSharedSecret() {
      this.$store.dispatch('Server/get', {
        key: 'webhookSharedSecret', path: 'webhook-generate-shared-secret',
        body: this.request
      })
    },

    onSubmit() {
      this.request = {
        event: this.selected,
        endpoint: this.endpoint,
      }

      this.$store.dispatch('Server/post', {
        key: 'webhookTest', path: 'webhook-test',
        body: {
          ...this.request,
          // keep secret out of this.request it is shown in the table
          webhook_shared_secret: this.sharedSecret
        }
      })
    }
  },

  watch: {
    ['webhookSharedSecret._loading']: function(loading) {
      if(!loading) {
        this.$emit('sharedSecret', this.webhookSharedSecret.success)
        this.showSecret = true
      }
    }
  },

  computed: {
    payEventModel: {
      get() {
        return this.payEvents
      },
      set(evt) {
        this.$emit('payEvents', evt)
      }
    },

    trxEventModel: {
      get() {
        return this.trxEvents
      },
      set(evt) {
        this.$emit('trxEvents', evt)
      }
    },

    sharedSecretMasked() {
      if(!this.sharedSecret) {
        return null
      }

      if(this.showSecret) {
        return this.sharedSecret
      } else {
        return this.sharedSecret.substring(0, 4) + '..' +
          this.sharedSecret.substring(this.sharedSecret.length - 4, this.sharedSecret.length)
      }
    },
  }
}
</script>
