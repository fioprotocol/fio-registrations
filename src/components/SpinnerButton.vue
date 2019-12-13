<template>
  <span>
    <b-button type="submit" size="sm" :style="{width}"
      :disabled="disabled" :class="buttonClass" @click="click"
    >
      <span v-if="!loading">
        <slot></slot>
      </span>
      <span v-else class="mt-1 spinner-grow spinner-grow-sm text-light"
         role="status" aria-hidden="true"
       ></span>
    </b-button>
  </span>
</template>

<script>
export default {
  name: 'SpinnerButton',
  props: {
    loading: Boolean,
    disabled: Boolean,
    buttonClass: String,
    width: {
      type: String,
      default: '150px'
    }
  },

  methods: {
    click(evt) {
      this.$emit('click', evt)
    }
  }
}
</script>
