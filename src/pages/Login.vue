<template>
  <main-layout>
    <div id="login" :class="{hidden: Login._loading === true}">
      <b-form @submit.stop.prevent="login">
        <div v-if="!changePassword && !pendingMfa" >
          <h1>Login</h1>

          <b-form-group label="Username / Email" label-for="regsrv-username">
            <b-input id="regsrv-username" autofocus
              autocomplete="on" ref="regsrv-username"
              type="text" placeholder="Enter username or email"
              v-model="username" required
            >
            </b-input>
          </b-form-group>

          <b-form-group label="Password" label-for="regsrv-password">
            <b-input type="password"
              id="regsrv-password" autocomplete="on"
              v-model="password" required
              placeholder="Enter password">
            </b-input>
          </b-form-group>

          <b-button type="submit" class="primary">
            Login
          </b-button>
        </div>

        <div v-if="pendingMfa">
          <h1>Multi-Factor Authentication</h1>

          <b-form-group label="Authenticator Code" label-for="mfa-code">
            <b-input type="text"
              id="mfa-code" autocomplete="new-password"
              v-model="code" required autofocus
              placeholder="Enter 6 digit code">
            </b-input>
          </b-form-group>

          <b-button type="submit" class="primary">
            Verify
          </b-button>
        </div>

        <div v-if="changePassword && !pendingMfa">
          <h1>Change Password</h1>

          <b-form-group label="New Password" label-for="regsrv-password"
          description="Change your password (at least 8 characters)"
          >
            <b-input type="password"
            id="regsrv-password" ref="regsrv-password" autocomplete="on"
            v-model="password" required :state="passwordValidation"
            placeholder="Enter new password">
            </b-input>
          </b-form-group>

          <b-form-group
          label="Password Confirm" label-for="regsrv-password-confirm"
          description="Re-enter new password">
            <b-input
            type="password" autocomplete="off"
            v-model="password_confirm" required :state="passwordValidation"
            placeholder="Enter password confirmation">
            </b-input>
          </b-form-group>

          <b-button type="submit" class="primary">
            Update Password
          </b-button>
        </div>
      </b-form>

      <br/><alert :object="Login.alert"></alert>

    </div>
  </main-layout>
</template>

<script>
import {mapState} from 'vuex'
import MainLayout from '../layouts/Main.vue'
import Alert from '../components/Alert.vue'

export default {
  name: 'Login',

  components: {
    MainLayout,
    Alert
  },

  data() {
    return {
      username: '',
      password: '',
      password_confirm: '',
      code: ''
    }
  },

  props: {
    invite_email: null,
    email_password: null,
  },

  computed: {
    changePassword() {
      return this.Login.force_password_change
    },

    pendingMfa() {
      return this.Login.pending_mfa
    },

    passwordValidation() {
      const {password, password_confirm} = this
      if(!password && !password_confirm) {
        return null
      }
      return password.trim() === password_confirm && password.length >= 8
    },

    ...mapState({
      Login: state => state.Login,
      invite: state => state.Server.invite,
    }),
  },

  methods: {
    login() {
      const {username, password, changePassword, pendingMfa, code} = this
      if(pendingMfa) {
        this.$store.dispatch('Login/mfaLogin', { code })
      } else if(changePassword) {
        this.$store.dispatch('Login/changePassword', { password })
      } else {
        this.$store.dispatch('Login/login', {username, password})
      }
    },

    // focusInput() {
    //   const ref = this.$refs['regsrv-username'] || this.$refs['regsrv-password']
    //   ref.focus();
    // },

    async next(route) {
      if(this.Login.force_password_change) {
        // invite url
        // this.focusInput()
        return
      }

      if(this.Login.loggedIn) {
        if(this.Login.routeAfterLogin) {
          const route = this.Login.routeAfterLogin
          await this.$store.dispatch('Login/resetRouteAfterLogin')
          this.$router.push(route)
          return
        }
        this.$router.push(route ? route : {name: 'users'})
      }
    },
  },

  created() {
    const {invite_email, email_password} = this

    if(email_password) {
      this.$store.dispatch('Login/login', {
        username: invite_email, email_password
      })
    }
  },

  // mounted() {
  //   this.focusInput();
  // },

  watch: {
    ['Login.loggedIn']: async function(login) {
      if(login) {
        this.next()
      }
    },

    ['Login.force_password_change']: function(forceChange) {
      if(forceChange === false) {
        this.next({name: 'find'})
      }
    },
  },
}
</script>
