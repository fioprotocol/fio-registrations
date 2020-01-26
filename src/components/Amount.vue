<template>
  <div>
    <span v-if="value < 0">
      (<code>{{ Math.abs(value).toFixed(2) }}</code>)
    </span>
    <span v-else>
      {{ Math.abs(value).toFixed(2) }}
    </span>
  </div>
</template>

<script>
export default {
  name: 'Amount',

  props: {
    value: Number
  }
}
</script>
