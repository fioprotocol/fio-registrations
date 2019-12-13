<template>
  <main-layout>
    <div class="row mb-3">
      <b-col cols="auto" class="ml-auto">
        Hi <router-link :to="{name: 'user'}">{{Login.username}}</router-link>
        ( <router-link :to="{name: 'login'}"
          @click.native="logout">Sign out</router-link> )
      </b-col>
    </div>

    <div>
      <router-view></router-view>
    </div>
  </main-layout>
</template>

<script>
import MainLayout from '../layouts/Main.vue'
import {mapState} from 'vuex'

export default {
  name: 'Admin',
  components: {
    MainLayout
  },
  data() {
      return {};
  },
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
