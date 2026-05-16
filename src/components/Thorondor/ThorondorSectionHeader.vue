<template>
  <section class="section-box intro-box">
    <header class="section-topline">
      <article class="module-header">
        <span v-if="kicker" class="section-kicker">{{ kicker }}</span>
        <component :is="titleTag" class="section-name">{{ title }}</component>
        <p v-if="copy" class="section-copy">{{ copy }}</p>
        <slot></slot>
      </article>

      <aside v-if="hasBadge" class="phase-badge-block">
        <span v-if="badge" class="phase-badge">{{ badge }}</span>
        <small v-if="badgeNote">{{ badgeNote }}</small>
        <slot name="aside"></slot>
      </aside>
    </header>
  </section>
</template>

<script>
export default {
  name: 'ThorondorSectionHeader',

  props: {
    kicker: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
    },
    titleTag: {
      type: String,
      default: 'h1',
    },
    copy: {
      type: String,
      default: '',
    },
    badge: {
      type: String,
      default: '',
    },
    badgeNote: {
      type: String,
      default: '',
    },
  },

  computed: {
    hasBadge() {
      return Boolean(this.badge || this.badgeNote || this.$slots.aside)
    },
  },
}
</script>
