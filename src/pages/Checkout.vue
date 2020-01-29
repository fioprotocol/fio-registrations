<template>
  <main-layout>
    <h1>Checkout</h1>


  </main-layout>
</template>

<script>
/* TODO */

import MainLayout from '../layouts/Main.vue'
import ServerMixin from '../components/ServerMixin'

export default {
  name: 'Checkout',

  props: {
    publicKey: String,
    extern_id: String
  },


  mixins: [
    ServerMixin('charge'),
  ],

  created() {
    const {extern_id} = this
    if(!extern_id) {
      return this.$router.push({name: 'home'})
    }

    // if(publicKey) {
    //   this.$store.dispatch('Server/get', {
    //     key: 'charge',
    //     path: '/public-api/check-public-key/' + publicKey
    //   })
    // }
  },

  components: {
    MainLayout
  }
}
</script>
