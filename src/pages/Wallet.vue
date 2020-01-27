<template>
  <div>
    <h1>{{newWallet ? 'Create New' : 'Update'}} Wallet</h1>

    <b-form @submit.stop.prevent="onSubmit" :hidden="wallet._loading">
      <b-form-group id="wallet-name-group"
        label="Wallet Name:" label-for="wallet-name"
        :description="(newWallet ? 'New' : 'Update') + ' Wallet Name.  Use a short name for display on the registration form.'"
      >
        <b-form-input id="wallet-name" ref="wallet-name" v-model="form.name"
          placeholder="Enter wallet name" required
          :state="walletNameValidation"
        >
        </b-form-input>
      </b-form-group>

      <b-form-group id="referral-group"
        label="Referral Code:" label-for="referral" type="text"
      >
        <b-form-input id="referral" v-model="form.referral_code"
          required minlength="3" maxlength="20"
          placeholder="Enter referral code"
          :state="referralValidation"
          :disabled="!newWallet"
        >
        </b-form-input>

        <small class="text-muted">
          <ul class="ml-1">
            <li>&rarr; Used in registration URL to identify this wallet.</li>
            <li v-if="newWallet">&rarr; Becomes read-only, choose carefully.</li>
            <li v-if="newWallet">&rarr; Lowercase letters, numbers, dashes</li>
            <li v-if="newWallet">&rarr; May be 3 to 20 characters in length</li>
          </ul>
        </small>
      </b-form-group>

      <b-form-group id="wallet-logo-group"
        label="Wallet Logo:" label-for="wallet-logo-url"
      >
        <b-form-input id="wallet-logo-url" v-model="form.logo_url"
          type="url" maxlength="255"
          placeholder="Enter wallet logo url"
        >
        </b-form-input>

        <small class="text-muted">Link to your wallet logo.  Optimal size 300px x 100px.</small>

        <div :class="{dim: !wallet.referral_code}" v-if="appInfo.uploadEnabled">
          <h4>~or~</h4>
          <div v-if="appInfo.uploadEnabled && !wallet.referral_code">
            Save the wallet first with your referral code to enable image upload&hellip;
          </div>

          <!-- no-drop -->
          <!-- :state="Boolean(logoFile)" -->
          <b-form-file
            class="mb-3"
            v-model="logoFile"
            :disabled="!wallet.referral_code"
            placeholder="Choose a file or drop it here..."
            drop-placeholder="Drop file here..."
            accept="image/*"
          ></b-form-file>

          <b-alert :show="uploadImage.error != null" variant="danger" dismissible>
            {{uploadImage.error}}
          </b-alert>
        </div>
        <div v-if="form.logo_url" class="mt-2">
          <img :src="form.logo_url" class="wallet-logo" id="logo">
        </div>
      </b-form-group>

      <b-form-group id="account-price-group" class="mb-4"
        label="New Account Sale Price:" label-for="account-price"
        description="Sale price for new accounts (in USD / USDC)"
      >
        <b-form-input id="account-price"
          v-model="form.account_sale_price"
          type="number" step="0.01" min="0.00"
          placeholder="Enter account sale price"
        >
        </b-form-input>

        <b-form-checkbox v-model="form.account_sale_active" class="mt-1">
          Account Sale Active
        </b-form-checkbox>
      </b-form-group>

      <b-form-group id="domain-price-group" class="mb-4"
        label="New Domain Sale Price:" label-for="domain-price" required
        description="Sale price for new domains (in USD / USDC)"
      >
        <b-form-input id="domain-price" v-model="form.domain_sale_price"
          type="number" min="0.03" step="0.01"
          placeholder="Enter domain sale price"
        >
        </b-form-input>

        <b-form-checkbox v-model="form.domain_sale_active" class="mt-1">
          Domain Sale Active
        </b-form-checkbox>
      </b-form-group>

      <b-form-group id="tpid-group"
        label="Technology Provider ID (TPID):" label-for="tpid" type="text"
      >
        <b-form-input id="tpid" v-model="form.tpid"
          placeholder="Enter tpid account name" :state="tpidValidation"
          required minlength="7" maxlength="127"
        >
        </b-form-input>

        <small class="text-muted">Enter the benificary account name (<b>account@domain</b>) that will receive fees from new registered accounts.</small>
      </b-form-group>

      <b-form-group id="domains-group"
        label="Domains:" label-for="domains"
      >
        <b-form-textarea id="domains" v-model="form.domains"
          placeholder="Enter domains" required
          :state="domainsValidation"
        >
        </b-form-textarea>

        <small class="text-muted">Provide each @<b>domain</b> on a separate line omitting the preceding colon.</small>
      </b-form-group>

      <b-form-group id="webhook-group"
        label="Webhook:" label-for="webhook-enabled"
      >
        <b-form-checkbox v-model="form.webhook_enabled" class="mb-3"
          id="webhook-enabled" name="check-button" switch>
          Enable Webhook
        </b-form-checkbox>

        <div class="row">
          <b-col cols="9">
            <b-form-input id="webhook-endpoint" v-model="form.webhook_endpoint"
              type="url" maxlength="255" :disabled="!form.webhook_enabled"
              placeholder="Enter the secure (https) webhook endpoint to your server."
            >
            </b-form-input>
            <small class="text-muted">Receive payment and transaction status notifications.</small>
          </b-col>
          <b-col cols="auto">
            <b-link v-b-modal.webhook-test-modal>
              Properties&hellip;
            </b-link>
            <b-modal id="webhook-test-modal" ok-only title="Webhook Properties">
              <WebhookProperties
                :endpoint="form.webhook_endpoint"
                :sharedSecret="form.webhook_shared_secret"
                @sharedSecret="form.webhook_shared_secret = $event"
                :payEvents="form.webhook_pay_events"
                @payEvents="form.webhook_pay_events = $event"
                :trxEvents="form.webhook_trx_events"
                @trxEvents="form.webhook_trx_events = $event"
              />
            </b-modal>
          </b-col>
        </div>
        <div v-if="!form.webhook_enabled && !webhookValidation" class="text-danger">
          <small>Add your webhook URL then use properties to create the required webhook sigining key.</small>
        </div>
      </b-form-group>

      <b-modal id="success-modal" title="Save Wallet" variant="info" @ok="resetUpsert" ok-only>
        {{upsertWallet.success}}
      </b-modal>

      <b-modal id="error-modal" title="Save Wallet" variant="danger" @ok="resetUpsert" ok-only>
        {{upsertWallet.error}}
      </b-modal>

      <div class="row">
        <b-col cols="auto">
          <b-button type="submit" size="sm" style="width: 150px;" :disabled="!valid">
            <span v-if="!upsertWallet._loading">
              Save
            </span>
            <span v-else class="mb-1 spinner-grow spinner-grow-sm text-light"
               role="status" aria-hidden="true"
             ></span>
          </b-button>
        </b-col>

        <b-col cols="auto" class="ml-auto" v-if="!newWallet">
          <b-button size="sm" @click="reset()" variant="warning">
            Reset
          </b-button>
        </b-col>
      </div>
    </b-form>

    <b-modal ref="unsavedModal" title="Warning"
      ok-title="Discard Changes" cancel-title="Stay Here"
      @ok="$router.push(to)" @hidden="to = null"
      ok-variant="warning"
    >
      Leave without saving changes?
    </b-modal>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import WebhookProperties from '../components/WebhookProperties'

function formDefaults () {
  return {
    name: '',
    referral_code: '',

    domain_sale_price: null,
    account_sale_price: null,

    domain_sale_active: false,
    account_sale_active: false,

    tpid: '',

    webhook_endpoint: '',
    webhook_enabled: false,
    webhook_shared_secret: null,
    webhook_pay_events: ['pending', 'success', 'review', 'cancel'],
    webhook_trx_events: ['pending', 'retry', 'success', 'expire', 'review', 'cancel'],

    logo_url: '',
    domains: '',
  }
}

export default {
  name: 'Wallet',

  components: {
    WebhookProperties
  },

  data() {
    return {
      form: formDefaults(),
      logoFile: null,
      uploadImagePath: null,
      to: null
    }
  },

  beforeRouteLeave (to, from, next) {
    if(this.to || !this.modified()) {
      next()
      return
    }
    this.to = to;
    this.$refs.unsavedModal.show()
  },

  watch: {
    ['wallet._loading']: function(loading) {
      if(!loading) {
        if(this.wallet.referral_code === undefined) {
          console.warn('undefined wallet')
          return
        }
        this.reset()
      }
    },

    ['logoFile']: function() {
      this.$store.dispatch('Server/reset', {key: 'uploadImage'})

      const fr = new FileReader();
      fr.readAsBinaryString(this.logoFile);
      fr.onload = () => {
        const folder = `${this.wallet.referral_code}/images`
        this.uploadImagePath = `/upload/${folder}/${this.logoFile.name}`
        this.$store.dispatch('Server/post', {
          key: 'uploadImage',
          path: 'upload',
          body: {
            folder,
            mimeType: this.logoFile.type,
            filename: this.logoFile.name,
            data: fr.result
          }
        })
      }
    },

    ['uploadImage._loading']: function(loading) {
      if(!loading) {
        this.form.logo_url = `${window.location.origin}${this.uploadImagePath}`
      }
    },

    ['upsertWallet.error']: function(error) {
      if(error) {
        this.$bvModal.show('error-modal')
      }
    },

    ['upsertWallet.success']: function(success) {
      if(success) {
        this.$bvModal.show('success-modal')
        this.$store.dispatch('Server/get', {
          key: 'wallet', path: 'wallet/' + this.form.referral_code
        })
      }
    },
  },

  props: {
    referralCode: {
      type: String,
      default: null
    },
  },

  methods: {
    onSubmit() {
      const body = JSON.parse(JSON.stringify(this.form))
      body.domains = this.form.domains.split('\n')

      if(
        this.wallet.webhook_enabled !== null && // already enabled
        this.form.webhook_enabled === true
      ) {
        // already enabled, don't reset the webhook_enabled date
        delete body.webhook_enabled
      }

      body.newWallet = this.newWallet

      this.$store.dispatch('Server/post', {
        key: 'upsertWallet', path: 'wallet', body
      })
    },

    formatWalletToForm() {
      const form = {}
      const defaults = formDefaults()
      for(let key in this.form) {
        let value
        if(key === 'webhook_enabled') {
          value = this.wallet[key] != null
        } else if(key === 'domains') {
          value = this.wallet[key] ? this.wallet[key].join('\n') : ''
        } else {
          const walletValue = this.wallet[key]
          value = walletValue == null ? defaults[key] : walletValue
        }
        form[key] = value
      }
      return form
    },

    reset() {
      if(this.wallet) {
        const form = this.formatWalletToForm()
        for(let key in this.form) {
          this.form[key] = form[key]
        }
      }
    },

    modified() {
      if(!this.wallet) {
        return false
      }
      const form = this.formatWalletToForm()
      for(let key in this.form) {
        if(this.form[key] !== form[key]) {
          return true
        }
      }
    },

    resetUpsert() {
      this.$store.dispatch('Server/reset', {key: 'upsertWallet'})
    },

    focusInput() {
      this.$refs['wallet-name'].focus();
    },
  },

  computed: {
    ...mapState({
      wallet: state => state.Server.wallet,
      upsertWallet: state => state.Server.upsertWallet,
      uploadImage: state => state.Server.uploadImage,
      appInfo: state => state.AppInfo.info,
    }),

    newWallet() {
      return ! this.wallet.referral_code
    },

    valid() {
      return (
        this.walletNameValidation &&
        this.referralValidation &&
        this.tpidValidation &&
        this.domainsValidation &&
        this.webhookValidation
      )
    },

    walletNameValidation() {
      return this.form.name.trim() !== ''
    },

    referralValidation() {
      return /^[a-z0-9-]{3,20}$/.test(this.form.referral_code)
    },

    tpidValidation() {
      return /^[a-zA-Z0-9@-]{4,}$/.test(this.form.tpid)
    },

    domainsValidation() {
      return this.form.domains.trim() !== ''
    },

    webhookValidation() {
      return !this.form.webhook_enabled || (
        this.form.webhook_shared_secret &&
        this.form.webhook_shared_secret.length >= 30
      )
    },
  },

  created() {
    this.$store.dispatch('AppInfo/load')
    if(this.referralCode) {
      this.$store.dispatch('Server/get', {
        key: 'wallet', path: 'wallet/' + this.referralCode
      })
    }
  },

  beforeDestroy() {
    this.$store.dispatch('Server/reset', {key: 'wallet'})
    this.$store.dispatch('Server/reset', {key: 'upsertWallet'})
  },

  mounted() {
    this.focusInput()
  },
}
</script>
