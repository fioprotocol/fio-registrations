import {mapState} from 'vuex'

export default function(variable, initialState = {}) {
  return {
    beforeCreate() {
      this.$store.dispatch('Server/init', {
        key: variable, data: initialState
      })
    },

    computed: {
      ...mapState({
        [variable]: function(state) {
          return state.Server[variable]
        },
      }),
    },

    beforeDestroy() {
      this.$store.dispatch('Server/reset', {key: variable})
    },
  }
}
