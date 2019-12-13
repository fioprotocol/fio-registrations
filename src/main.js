import Vue from 'vue'
import 'reset-css';

Vue.config.productionTip = false

import RouterView from './pages/RouterView.vue'
import VueRouter from 'vue-router'
import router from './router'

Vue.use(VueRouter)

import store from './store'
new Vue({
  el: '#app',
  store,
  router,
  render: h => h(RouterView),
})
