<script>
import { RouterView } from 'vue-router'
import ThorondorMiniFooter from './components/ThorondorMiniFooter.vue'
import ThorondorSidebar from './components/ThorondorSidebar.vue'
import ThorondorTopHeader from './components/ThorondorTopHeader.vue'

export default {
  name: 'App',

  components: {
    RouterView,
    ThorondorMiniFooter,
    ThorondorSidebar,
    ThorondorTopHeader,
  },

  data() {
    return {
      sidebarOpen: false,
    }
  },

  computed: {
    isAuthLayout() {
      return this.$route.meta.authLayout === true
    },
  },

  mounted() {
    this.$store.dispatch('bootstrapThorondor')
  },
}
</script>

<template>
  <section class="thorondor-app-shell" :class="{ 'is-auth-layout': isAuthLayout }">
    <ThorondorTopHeader v-if="!isAuthLayout" @open-sidebar="sidebarOpen = true" />

    <button
      v-if="!isAuthLayout"
      class="sidebar-backdrop"
      :class="{ 'is-visible': sidebarOpen }"
      type="button"
      aria-label="Cerrar navegación"
      @click="sidebarOpen = false"
    ></button>

    <ThorondorSidebar v-if="!isAuthLayout" :open="sidebarOpen" @close="sidebarOpen = false" />

    <main class="thorondor-route-frame" :class="{ 'is-auth-layout': isAuthLayout }" @click="sidebarOpen = false">
      <RouterView />
      <ThorondorMiniFooter v-if="!isAuthLayout" />
    </main>
  </section>
</template>

<style scoped>
.thorondor-app-shell {
  min-height: 100vh;
  background: var(--thorondor-grid-background);
  background-size: var(--thorondor-grid-background-size);
  background-attachment: fixed;
  color: #e0e6ed;
}

.thorondor-route-frame {
  min-height: 100vh;
  margin-left: var(--sidebar-width);
  padding-top: var(--main-header-height);
}

.thorondor-route-frame.is-auth-layout {
  margin-left: 0;
  padding-top: 0;
}

.sidebar-backdrop {
  position: fixed;
  inset: var(--main-header-height) 0 0;
  z-index: 2400;
  display: none;
  border: 0;
  background: rgba(0, 0, 0, 0.52);
}

@media (max-width: 1040px) {
  .thorondor-route-frame {
    margin-left: 0;
  }

  .sidebar-backdrop.is-visible {
    display: block;
  }
}

@media (max-width: 900px) {
  .thorondor-app-shell {
    background: var(--thorondor-grid-background);
    background-size: var(--thorondor-grid-background-size);
  }

  .sidebar-backdrop {
    background: rgba(3, 6, 10, 0.68);
    backdrop-filter: blur(4px);
  }
}
</style>
