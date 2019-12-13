import {server} from '../api'
import Loading from './loading'

const loading = Loading()

function getDefaultState() {
  return {
    loggedIn: false,
    username: null,
    pending_mfa: null,
    force_password_change: null,
    routeAfterLogin: null,
    alert: {},
    ...loading.defaults(),
    ...loading.defaults(['changePassword']),
  }
}

export default {
  namespaced: true,

  state: getDefaultState(),

  actions: {
    async login({commit, state}, {username, password, email_password}) {
      loading(state, async () => {
        const result = await server.post('/public-api/login', {
          username, password, email_password
        })
        commit('login', result)
      })
    },

    async mfaLogin({commit, state}, {code}) {
      loading(state, async () => {
        const result = await server.post(
          '/public-api/login-mfa', { code }
        )
        commit('mfaLogin', result)
      })
    },

    async changePassword({commit, state}, {password}) {
      loading(state.changePassword, async () => {

        // No need to pass username or old password, server.state has the signed user_id
        const result = await server.post('/public-api/change-password', {
          password
        })
        commit('changePassword', result)
      })
    },

    async updateUsername({state}, {username}) {
      state.username = username
    },

    async logout({state}) {
      Object.assign(state, getDefaultState())
      server.logout()
    },

    async resetRouteAfterLogin({state}) {
      state.resetRouteAfterLogin = null
    },
  },

  mutations: {
    login(state, result) {
      loading.done(state)

      const {success, error} = result
      state.alert = {success, error}

      if(result.success) {
        state.username = result.username
        state.force_password_change = result.force_password_change // /api/* checks too
        state.pending_mfa = result.pending_mfa
        if(!state.pending_mfa) {
          state.loggedIn = result.success
        }
      }
    },

    mfaLogin(state, result) {
      loading.done(state)

      const {success, error} = result
      state.alert = {success, error}

      if(result.success) {
        state.pending_mfa = false
        state.loggedIn = true
      }
    },

    changePassword(state, result) {
      loading.done(state.changePassword)
      const {success, error} = result
      state.alert = {success, error}

      if(success) {
        state.force_password_change = false
      }
    },
  }
}
