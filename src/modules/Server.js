import Vue from 'vue'
import {server, fio} from '../api'
import Loading from './loading'

const loading = Loading()

export default {
  namespaced: true,

  state: {
      ...loading.defaults([
      'user', 'users', 'saveUser', 'deleteUser',
      'accountProfile', 'accountProfiles', 'saveAccountProfile', 'deleteAccountProfile',
      'find', 'findRefresh', 'refreshPaymentResult',
      'sendInvite', 'invite',
      'wallet', 'wallets', 'upsertWallet', 'uploadImage', 'fillRegistrationsSearch'
    ]),
  },

  actions: {
    init({state}, {key, data = {}}) {
      Vue.set(state, key, {
        ...loading.defaults(),
        ...data
      })
    },

    async get({dispatch}, payload) {
      payload.method = 'get'
      dispatch('fetch', payload)
    },

    async post({dispatch}, payload) {
      payload.method = 'post'
      dispatch('fetch', payload)
    },

    async delete({dispatch}, payload) {
      payload.method = 'delete'
      dispatch('fetch', payload)
    },

    async fetch({commit, state}, {
      key, path = key, method, body, api = 'server' // or 'fio'
    }) {
      if(!path) { throw new Error('missing: path') }

      if(!key) { throw new Error(`Unknown key ${key}`) }

      if(!/^fio$|^server$/.test(api)) {
        throw new Error(`api parameter should be: fio or server`)
      }

      let data = state[key]
      if(!data) {
        data = Vue.set(state, key, loading.defaults())
      }

      loading(data, async () => {
        if(api === 'server') {
          const baseUrl = path.startsWith('/public-api/') ? '' : '/api/'
          const result = await server.fetch[method](baseUrl + path, body)
          commit('result', {key, result})

        } else if(api === 'fio') {
          const result = await fio.chain[method](path, body)
          commit('result', {key, result})
        }
      })
    },

    async clear({state}, {key}) {
      Vue.delete(state, key)
    },

    async reset({state}, {key}) {
      const data = state[key]
      if(!key || !data) {
        throw new Error(`Unknown key ${key}`)
      }

      const keys = Object.keys(data)
      keys.forEach(key => {
        Vue.delete(data, key)
      })

      // turn loading boolean off
      const defaults = loading.defaults()
      for (var def in defaults) {
        Vue.set(data, def, defaults[def])
      }
    },
  },

  mutations: {
    result(state, {key, result}) {
      const data = state[key]
      if(data == null) {
        // A component can be destroyed before a request finishes
        return
      }

      loading.done(data)

      if(Array.isArray(result)) {
        Vue.set(data, 'list', result)
      } else {
        for (let field in result) {
          const value = result[field]
          Vue.set(data, field, value)
        }
      }
    },
  }
}
