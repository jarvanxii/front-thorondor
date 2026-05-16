<template>
  <section class="metric-grid" :class="gridClass">
    <article v-for="item in items" :key="item.label" class="metric-card" :class="item.cardClass">
      <label>{{ item.label }}</label>
      <span :class="item.tone">{{ item.value }}</span>
      <small>{{ item.note }}</small>
    </article>
  </section>
</template>

<script>
export default {
  name: 'ThorondorMetricGrid',

  props: {
    items: {
      type: Array,
      required: true,
    },
    gridClass: {
      type: [String, Array, Object],
      default: '',
    },
  },
}
</script>
