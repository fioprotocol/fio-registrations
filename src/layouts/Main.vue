<template>
  <div class="container-fluid">
    <b-card title="Registration Server" no-body>
      <div v-if="!Login.loggedIn">
        <b-card-header header-tag="nav" class="pt-1">
          <b-nav card-header tabs>
            <b-nav-item :to="{name: 'login'}" exact exact-active-class="active">
              Login
            </b-nav-item>
          </b-nav>
        </b-card-header>
      </div>

      <div v-if="Login.loggedIn">
        <b-card-header header-tag="nav" class="pt-1" footer-tag="footer">
          <b-nav card-header tabs>
            <b-nav-item :to="{name: 'find'}"
              exact exact-active-class="active"
            >
              Search
            </b-nav-item>

            <b-nav-item :to="{name: 'users'}"
              exact exact-active-class="active"
            >
              Admin Users
            </b-nav-item>

            <b-nav-item :to="{name: 'account-profiles'}"
              exact exact-active-class="active"
            >
              Account Profiles
            </b-nav-item>

            <b-nav-item :to="{name: 'wallets'}"
              exact exact-active-class="active"
            >
              Wallets
            </b-nav-item>

            <b-nav-item :to="{name: 'user'}"
              exact exact-active-class="active"
            >
              My Profile
            </b-nav-item>
          </b-nav>
        </b-card-header>
      </div>

      <b-card-body class="pt-2">
        <slot></slot>
      </b-card-body>

      <template v-slot:footer>
        <a href="/docs/api/index.html" target="_blank" class="pull-right">API</a>
      </template>
    </b-card>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import '../assets/admin.scss'
import '../assets/custom.scss'

import Vue from 'vue'

import B from 'bootstrap-vue'
Vue.use(B)
// Vue.component('b-navbar', B.BNavbar)
// Vue.component('b-navbar-nav', B.BNavbarNav)
// Vue.component('b-navbar-brand', B.BNavbarBrand)
// Vue.component('b-navbar-toggle', B.BNavbarToggle)

export default {
  name: 'Main',

  methods: {
    logout() {
      this.$store.dispatch('Login/logout')
    }
  },

  computed: {
    ...mapState({
      Login: state => state.Login
    })
  }
}
</script>
