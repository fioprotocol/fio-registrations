<template>
  <span>
    <span v-if="remaining">
      <span>
        <slot name="prefix"></slot>
      </span>

      <span v-if="hours">{{hours}}:</span>
      <span>{{minutes}}:</span>
      <span>{{seconds}}</span>
    </span>
    <span v-else>
      <slot name="expired"></slot>
    </span>
  </span>
</template>

<script>
let uid = 0

// emit 'remaining' true or false
// emit 'expiring' if expiring_at provided and when time reaches this point

export default {
  name: 'Elapsed',

  props: {
    expires_at: {
      /** Valid argument for JavaScript's Date constructor */
      type: [Object, Number, String],
      required: false
    },

    expiring_at: {
      /** Milliseconds before expires_at to emit an 'expiring' event */
      type: Number,
      required: false,
      default: null
    }
  },

  data() {
    return {
      now: Date.now(),
    }
  },

  beforeCreate() {
    this.uid = ++uid
  },

  beforeDestroy() {
    clearInterval(window[`ellapsed${this.uid}`])
  },

  created() {
    clearInterval(window[`ellapsed${this.uid}`])
    window[`ellapsed${this.uid}`] = setInterval(() => this.now = Date.now(), 1000)

    if(this.remaining !== undefined) {
      this.$emit('remaining', this.remaining)
    }

    if(this.expiring !== undefined) {
      this.$emit('expiring')
    }
  },

  computed: {
    expire() {
      return new Date(this.expires_at).getTime()

      // Remaining expiring, expired test cases
      // return new Date().getTime() + (1000 * 60 * 60 * 24) + 4000
      // return new Date().getTime() + (1000 * 60 * 60) + 4000
      // return new Date().getTime() + (1000 * 60) + 4000
      // return new Date().getTime() + (1000) + 4000
    },

    remaining() {
      if(!this.expires_at) {
        return
      }

      return this.now < this.expire
    },

    expiring() {
      if(!this.expiring_at) {
        return
      }

      return this.expire - this.now <= this.expiring_at
    },

    hours() {
      const seconds = Math.round((this.expire - this.now) / 1000)
      const val = Math.floor(seconds / (60 * 60))
      return val
    },

    minutes() {
      const seconds = Math.round((this.expire - this.now) / 1000)
      const val = Math.floor((seconds / 60) % 60)
      return `${val < 10 ? '0' : ''}${val}`
    },

    seconds() {
      const seconds = Math.round((this.expire - this.now) / 1000)
      const val = seconds % 60
      return `${val < 10 ? '0' : ''}${val}`
    }
  },

  watch: {
    remaining: function(val) {
      if(val !== undefined) {
        this.$emit('remaining', val)
      }
    },

    expiring: function(val) {
      if(val !== undefined) {
        this.$emit('expiring')
      }
    }
  },

}
</script>
