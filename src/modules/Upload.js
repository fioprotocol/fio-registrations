import Loading from './loading'
const loading = Loading()

export default {
  namespaced: true,

  state: {
    ...loading.defaults(),
    url: ''
  },

  actions: {
    async save({dispatch}, payload) {

      dispatch('save', payload)
    },
  },

  mutations: {
    save(state, {key, result}) {
      loading.done(data)
    },
  }
}
