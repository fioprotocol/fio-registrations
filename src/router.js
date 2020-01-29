import VueRouter from 'vue-router'
import store from './store';

// Non Bootstrap Vue components (saves size and load time)
const Home = () => import(/* webpackChunkName: "registrations" */ './pages/Home.vue')
// const Checkout = () => import(/* webpackChunkName: "registrations" */ './pages/Checkout.vue')
const NotFound = () => import(/* webpackChunkName: "registrations" */ './pages/404.vue')

// Bootstrap Vue components
const Login = () => import(/* webpackChunkName: "admin" */ './pages/Login.vue')
const Admin = () => import(/* webpackChunkName: "admin" */ './pages/Admin.vue')
const Find = () => import(/* webpackChunkName: "admin" */ './pages/Find.vue')
const Users = () => import(/* webpackChunkName: "admin" */ './pages/Users.vue')
const UserProfile = () => import(/* webpackChunkName: "admin" */ './pages/UserProfile.vue')
const SendInvite = () => import(/* webpackChunkName: "admin" */ './pages/SendInvite.vue')
const Wallets = () => import(/* webpackChunkName: "admin" */ './pages/Wallets.vue')
const Wallet = () => import(/* webpackChunkName: "admin" */ './pages/Wallet.vue')

const beforeEnter = (to, from, next) => {
  if(to.name !== 'login') {
    const { loggedIn, force_password_change } = store.state.Login
    if (!loggedIn || force_password_change) {
      store.state.Login.routeAfterLogin = to
      // console.log('to login', to);
      return next({name: 'login'})
    }
  }

  if(to.name !== 'user') {
    const { username } = store.state.Login
    if (!username) {
      // console.log('to user', to);
      return next({name: 'user'})
    }
  }

  next()
}


const routes = [
  { path: '/(address|ref)/:referralCode?/:defaultDomain?', component: Home, props: true },
  { path: '/(domain)/:referralCode?', component: Home, props: true },

  // { path: '/page/checkout/:extern_id?', component: Checkout, name: 'checkout', props: true }, // TODO
  { path: '/page/login/:invite_email?/:email_password?', component: Login, name: 'login', props: true },

  {
    path: '/admin', component: Admin, name: 'admin',
    children: [
      { path: 'find/:search?', component: Find, name: 'find', beforeEnter, props: true },
      { path: 'users', name: 'users', component: Users, beforeEnter },
      { path: 'user', name: 'user', component: UserProfile, beforeEnter },
      { path: 'send-invite', name: 'send-invite', component: SendInvite, beforeEnter },
      { path: 'wallets', name: 'wallets', component: Wallets, beforeEnter },
      { path: 'wallet/:referralCode?', name: 'wallet', component: Wallet, beforeEnter, props: true },
    ]
  },

  // { path: '/:referralCode?', component: Home, props: true },
  // { path: '/:referralCode?/(address|domain)', component: Home, props: true },
  // { path: '/:referralCode?/:defaultDomain?', component: Home, props: true },
  { path: '/', component: Home, name: 'home', props: true },
  { path: '*', component: NotFound },
]

const router = new VueRouter({
  routes,
  mode: 'history',
  linkActiveClass: 'active',
})

export default router
