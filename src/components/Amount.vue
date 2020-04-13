<template>
  <div>
    <span v-if="value < 0">
      (<code class="credit">{{ Math.abs(value).toFixed(2) }}</code>)
    </span>
    <span v-else>
      <code>{{ Math.abs(value).toFixed(2) }}</code>
    </span>
  </div>
</template>

<script>
export default {
  name: 'Amount',

  props: {
    value: [Number, String]
  }
}
</script>
