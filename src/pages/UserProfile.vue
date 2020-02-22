<template>
  <div>
    <div>
      <div class="mb-2" v-if="user.username === null">
        <b-alert variant="info" show>
          Welcome! Please setup your profile..
        </b-alert>
      </div>

      <b-form @submit="onSubmit">
        <!-- validated -->
        <b-form-group id="username-group"
          label="Username:" label-for="username"
          :description="newUser !== false ?
            'Becomes read-only. Lowercase letters and numbers' :
            'Your username / handle'
          "
        >
          <b-form-input
            id="username" ref="username"
            :disabled="user.username !== null"
            :state="usernameValidation"
            v-model="form.username"
            required minlength="3" maxlength="20"
          ></b-form-input>
        </b-form-group>

        <b-form-group
          id="email-group" type="email"
          label="Email:" label-for="email"
          description="Login, notifications and password resets"
        >
          <b-form-input
            id="email" ref="email" type="email"
            v-model="form.email"
            required
            placeholder="Enter email"
          ></b-form-input>
        </b-form-group>

        <div v-if="newUser === false">
          <b-form-group id="password-group"
            label="Password:" label-for="password"
            description="Change your password (at least 8 characters, no spaces)"
          >
            <b-form-input
              id="password-change" type="password"
              minlength="8" maxlength="60"
              :state="passwordValidation"
              v-model="form.password"
              autocomplete="new-password"
            ></b-form-input>
          </b-form-group>

          <b-form-group id="password-confirm-group"
            label="Password Confirm:" label-for="password-confirm"
            description="Re-enter new password"
          >
            <b-form-input
              id="password-confirm" ref="password-confirm" type="password"
              minlength="8" maxlength="60"
              :state="passwordValidation"
              v-model="form.password_confirm"
              autocomplete="off"
            ></b-form-input>
          </b-form-group>
        </div>

        <div class="row" v-if="!newUser">
          <b-col cols="6">
            <b-form-checkbox
              :disabled="!canEnableMfa" v-model="form.mfa_enabled"
              name="check-button" switch
            >
              Multi-Factor Authentication
            </b-form-checkbox>
            <div v-if="!canEnableMfa">
              <small class="text-muted">
                Setup a MFA key under <u>Properties&hellip;</u>
              </small>
            </div>
          </b-col>
          <b-col cols="auto">
            <b-link v-b-modal.mfa-modal>
              Properties&hellip;
            </b-link>
            <b-modal id="mfa-modal" ok-only ok-title="Close"
              title="Multi-Factor Authentication"
            >
              <Mfa @mfaUpdated="form.mfa_enabled = true" />
            </b-modal>
          </b-col>
        </div>

        <br/>
        <div class="row" v-if="!newUser">
          <b-col cols="6">
            <b-form-checkbox
              :disabled="!canEnableApi"
              v-model="form.api_enabled"
              name="check-button"
              switch
            >
              API Bearer Token
            </b-form-checkbox>
            <div v-if="!canEnableApi">
              <small class="text-muted">
                Setup the API key under <u>Properties&hellip;</u>
              </small>
            </div>
          </b-col>
          <b-col cols="auto">
            <b-link v-b-modal.api-modal>
              Properties&hellip;
            </b-link>
            <b-modal id="api-modal" ok-only ok-title="Close"
              title="API Bearer Token"
            >
              <ApiBearer @apiUpdated="form.api_enabled = true" />
            </b-modal>
          </b-col>
        </div>

        <br/>
        <div class="mt-2">
          <b-alert :show="saveUser.success != null" variant="info" dismissible>
            {{saveUser.success}}
          </b-alert>

          <b-alert :show="saveUser.error" variant="danger" dismissible>
            {{saveUser.error}}
          </b-alert>
        </div>

        <div class="row">
          <b-col cols="auto">
            <b-button type="submit" size="sm" :disabled="!valid">
              Save
            </b-button>
          </b-col>
          <b-col cols="auto" class="ml-auto">
            <b-button size="sm" @click="reset()" variant="warning">
              Reset
            </b-button>
          </b-col>
        </div>
      </b-form>

      <b-modal ref="unsavedModal"
        title="Warning" ok-title="Discard Changes" cancel-title="Stay Here"
        @ok="$router.push(to)" @hidden="to = null"
        ok-variant="warning"
      >
        Leave without saving changes?
      </b-modal>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import {mapState} from 'vuex'
import Mfa from '../components/Mfa'
import ApiBearer from '../components/ApiBearer'

function formDefaults () {
  return  {
    username: '',
    password: '',
    password_confirm: '',
    email: '',
    mfa_enabled: null,
    api_enabled: null,
  }
}

export default {
  name: 'UserProfile',

  components: {
    Mfa, ApiBearer
  },

  data() {
    return {
      form: formDefaults(),
      newUser: null,
      to: null
    }
  },

  watch: {
    ['user._loading']: function(loading) {
      if(!loading) {
        for(let key in this.form) {
          this.form[key] = this.user[key]
        }
        this.newUser = this.user.username === null
      }
    },

    ['saveUser.success']: function(success) {
      if(success) {
        this.$store.dispatch('Server/get', {key: 'user'})
        this.$store.dispatch('Login/updateUsername', {username: this.form.username})
      }
    },

    ['newUser']: function() {
      Vue.nextTick(() => {
        this.focusInput()
      })
    },

  },

  beforeRouteLeave (to, from, next) {
    if(this.to || !this.modified()) {
      next()
      return
    }
    this.to = to;
    this.$refs.unsavedModal.show()
  },

  methods: {
    formatToForm() {
      const form = {}
      const defaults = formDefaults()
      for(let key in this.form) {
        let value
        const backendValue = this.user[key]
        value = backendValue == null ? defaults[key] : backendValue
        form[key] = value
      }
      return form
    },

    reset() {
      if(this.user) {
        const form = this.formatToForm()
        for(let key in this.form) {
          this.form[key] = form[key]
        }
      }
    },

    modified() {
      if(!this.user) {
        return false
      }
      for(let key in this.form) {
        if(this.form[key] !== this.user[key]) {
          return true
        }
      }
    },

    onSubmit(evt) {
      evt.preventDefault()

      const {email, mfa_enabled, api_enabled} = this.form
      const body = {email, mfa_enabled, api_enabled}

      if(this.user.username === null) { // new user
        body.username = this.form.username
      }

      if(this.form.password) {
        body.password = this.form.password
      }

      this.$store.dispatch('Server/post', {
        key: 'saveUser', path: 'user', body
      })
    },

    focusInput() {
      this.$refs[this.newUser ? 'username' : 'email'].focus();
    },
  },

  computed: {
    ...mapState({
      user: state => state.Server.user,
      saveUser: state => state.Server.saveUser,
    }),

    canEnableMfa() {
      return this.form.mfa_enabled || this.user.mfa_exists
    },

    canEnableApi() {
      return this.form.api_enabled || this.user.api_exists
    },

    valid() {
      const pwValid = this.passwordValidation
      return (pwValid === null || pwValid) && this.usernameValidation
    },

    usernameValidation() {
      const {username} = this.form
      return /^[a-z][a-z0-9]{2,29}$/.test(username || '')
    },

    passwordValidation() {
      const {password, password_confirm} = this.form
      if(!password && !password_confirm) {
        return null // unchanged
      }

      // 8 to 60 characters but no space
      if(!/^[^ ]{8,60}$/.test(password)) {
        return false
      }

      return password === password_confirm
    },
  },

  created() {
    this.$store.dispatch('Server/get', {key: 'user'})
  },

  beforeDestroy() {
    if(this.user.username !== undefined) {
      this.newUser = this.user.username === null
    }
    this.$store.dispatch('Server/reset', {key: 'user'})
    this.$store.dispatch('Server/reset', {key: 'saveUser'})
  },
}
</script>
