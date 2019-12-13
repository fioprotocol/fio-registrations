<template>
  <div>
    <div>
      <h4>New MFA Shared Secret</h4>
      <div class="container">{{sharedSecretMasked}}</div>

      <br />
      <div v-if="this.sharedSecret">
        <b-button @click="showSecret = !showSecret">
          {{showSecret ? 'Hide' : 'Show'}}
        </b-button>
      </div>

      <br/>
      <div v-if="dataUrl">
        <div>
          <h4>New MFA QR Code</h4>

          <div class="container">
            <div class="row">
              <img :src="dataUrl" />
            </div>
            <small class="text-muted">
              Scan this QR code in your authenticator app; it contains
              the <b class="text-nowrap">MFA Shared Secret</b> above.

              <br/>
              <small>
                <b>* The MFA Shared Secret becomes unavailable after your finish.</b>
              </small>
            </small>
          </div>

          <br/>
          <h3>Backup Codes</h3>
          <div class="container">
            <small>
              <div v-for="row in 4" v-bind:key="row">
                <span v-for="pos in 4" v-bind:key="pos">
                  <code>{{backupCodes[
                    ((row - 1) * 4) + (pos - 1)
                  ]}}&nbsp;&nbsp;</code>
                </span>
                <br/>
              </div>
            </small>
          </div>
          <div class="container">
            <small><b>* Save these backup codes now; this is your only chance.  If
              you loose your authentiator you can use any backup code only once
              to access your account and re-set your authentiator.</b>
            </small>
          </div>
        </div>
      </div>
    </div>

    <br/>
    <div v-if="sharedSecret">
      <h4>Enter Code to Enable</h4>

      <b-form @submit.stop.prevent="onSubmit">
        <b-form-group
          id="code-group"
          label="Authenticator Code:" label-for="code"
          description="Enter the code from your authenticator application."
        >
          <b-form-input
            id="code" ref="code" type="text" autofocus
            :disabled="mfaUpdateRequest.success != null"
            v-model="form.code" required autocomplete="new-password"
            placeholder="Enter 6 digit code"
          ></b-form-input>
        </b-form-group>

        <b-alert :show="mfaUpdateRequest.error != null" variant="danger" dismissible>
          {{mfaUpdateRequest.error}}
        </b-alert>

        <b-alert :show="mfaUpdateRequest.success != null" variant="success" dismissible>
          {{mfaUpdateRequest.success}}
        </b-alert>

        <SpinnerButton :loading="mfaSharedSecret._loading"
          :disabled="!validateCode || mfaUpdateRequest.success != null"
        >
          Save
        </SpinnerButton>
      </b-form>
    </div>
  </div>
</template>

<script>
import SpinnerButton from './SpinnerButton'
import ServerMixin from './ServerMixin'
import qrcode from 'qrcode'

export default {
  name: 'Mfa',

  mixins: [
    ServerMixin('mfaSharedSecret'),
    ServerMixin('mfaUpdateRequest'),
  ],

  components: {
    SpinnerButton
  },

  data() {
    return {
      form: {
        code: null,
      },
      showSecret: false,
      sharedSecret: null,
      backupCodes: null,
      otpauth: null,
      dataUrl: null
    }
  },

  created() {
    if(!this.sharedSecret) {
      this.generateMfaSecret()
    }
  },

  methods: {
    generateMfaSecret() {
      this.$store.dispatch('Server/get', {
        key: 'mfaSharedSecret', path: 'mfa-generate',
      })
    },

    onSubmit() {
      this.$store.dispatch('Server/post', {
        key: 'mfaUpdateRequest', path: 'mfa-update',
        body: {
          code: this.form.code,
          sharedSecret: this.sharedSecret,
          backupCodes: this.backupCodes,
        }
      })
    },

    async updateQrImg() {
      this.dataUrl = await qrcode.toDataURL(this.otpauth)
    },
  },

  watch: {
    ['mfaSharedSecret._loading']: function(loading) {
      if(!loading) {
        const {sharedSecret, backupCodes, otpauth} = this.mfaSharedSecret.success
        this.sharedSecret = sharedSecret
        this.backupCodes = backupCodes
        this.otpauth = otpauth
        this.updateQrImg()
      }
    },

    ['mfaUpdateRequest.success']: function(success) {
      if(success != null) {
        this.$emit('mfaUpdated')
        this.showSecret = false
      }
    },
  },

  computed: {
    validateCode() {
      return /[0-9]{6}/.test(this.form.code)
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
    }
  }
}
</script>
