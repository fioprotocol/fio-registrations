<template>
  <div>
    <transition-group name="fade" v-on:before-enter="beforeEnter" v-on:after-leave="afterLeave" appear>
      <div v-for="message of Object.keys(alerts)" v-bind:key="message">
        <component v-bind:is="alerts[message]"></component>
      </div>
    </transition-group>
    <div v-if="placeHolder" key="empty">
      <div class="alert hidden" role="alert">hidden</div>
    </div>
    <slot></slot>
  </div>
</template>

<script>
import Vue from 'vue'

export default {
  props: {
    // object = {[type] : message}
    // where type = info, error, success (as defined in style sheet)
    object: Object,

    // Only 1 alert at a time
    singleton: {
      type: Boolean,
      default: true
    },

    timeout: {
      type: Number,
      default: 7
    }
  },

  data() {
    return {
      alerts: {},
      placeHolder: true
    }
  },

  watch: {
    object: function(object) {
      this.handleAlert(object)
    }
  },

  created() {
    // window.addEventListener('keydown', this.hide)
    // window.addEventListener('click', this.hide)
    if(this.object && Object.keys(this.object).length !== 0) {
      this.placeHolder = false
      this.handleAlert(this.object)
    } else {
      this.placeHolder = true
    }
  },

  // beforeDestroy() {
  //   window.removeEventListener('keydown', this.hide)
  // },

  methods: {
    beforeEnter(el) {
      // console.log('be', el.textContent, el)
      const placeHolderEl = el.textContent === 'hidden'
      if(!placeHolderEl) {
        this.placeHolder = false
      }
    },

    afterLeave(el) {
      // console.log('al', el.textContent === '', el)
      const placeHolderEl = el.textContent === 'hidden'
      if(!placeHolderEl && Object.keys(this.alerts).length === 0) {
        this.placeHolder = true
      }
    },

    handleAlert(value) {
      if(this.singleton) {
        for(const message in this.alerts) {
          Vue.delete(this.alerts, message)
        }
      }

      let type, message
      const keys = Object.keys(value)
      for(let i = 0; i < keys.length; i++) {
        type = keys[i]
        message = value[type]
        if(message != null) {
          break
        }
      }

      if(!type || !message) {
        return
      }
      // console.log(type, message)

      const cmp = Vue.component('alert', {
        render(createElement) {
          return createElement(
            'div', {
              attrs: {
                class: `alert ${type} alert-${type}`,
                role: 'alert'
              }
            },
            [message]
          )
        }
      })

      Vue.set(this.alerts, message, cmp)

      if(this.timeout) {
        const timeout = (this.timeout * 1000) + (message.length / 40 + 1000)
        setTimeout(() => Vue.delete(this.alerts, message), timeout)
      }
    }
  }
}
</script>

<style scoped>
.hidden {
  visibility: hidden;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
