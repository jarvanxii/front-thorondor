import { createRouter, createWebHistory } from 'vue-router'
import { fetchThorondorSession } from '@/features/thorondor/services/thorondorAuth'

const routes = [
  {
    path: '/',
    redirect: { name: 'thorondor-login' },
  },
  {
    path: '/login',
    name: 'thorondor-login',
    component: () => import('../views/Thorondor/ThorondorLoginView.vue'),
    meta: { authLayout: true },
  },
  {
    path: '/login/callback',
    name: 'thorondor-auth-callback',
    component: () => import('../views/Thorondor/ThorondorAuthCallbackView.vue'),
    meta: { authLayout: true },
  },
  {
    path: '/privacidad',
    name: 'thorondor-privacy',
    component: () => import('../views/Thorondor/ThorondorLegalView.vue'),
    meta: { authLayout: true },
  },
  {
    path: '/terminos',
    name: 'thorondor-terms',
    component: () => import('../views/Thorondor/ThorondorLegalView.vue'),
    meta: { authLayout: true },
  },
  {
    path: '/contacto',
    name: 'thorondor-contact',
    component: () => import('../views/Thorondor/ThorondorLegalView.vue'),
    meta: { authLayout: true },
  },
  {
    path: '/inicio',
    name: 'thorondor-information',
    component: () => import('../views/Thorondor/ThorondorView.vue'),
  },
  {
    path: '/instalacion',
    name: 'thorondor-installation-guide',
    component: () => import('../views/Thorondor/Thorondor-GuiaInstalacionView.vue'),
  },
  {
    path: '/registro',
    name: 'thorondor-agent-registration',
    component: () => import('../views/Thorondor/Thorondor-RegistroAgentesView.vue'),
  },
  {
    path: '/dashboard',
    name: 'thorondor-dashboard',
    component: () => import('../views/Thorondor/Thorondor-DashboardView.vue'),
  },
  {
    path: '/eventos',
    name: 'thorondor-events',
    component: () => import('../views/Thorondor/Thorondor-EventosView.vue'),
  },
  {
    path: '/host',
    name: 'thorondor-host-detail',
    component: () => import('../views/Thorondor/Thorondor-DetalleHostsView.vue'),
  },
  {
    path: '/alertas',
    name: 'thorondor-alerts',
    component: () => import('../views/Thorondor/Thorondor-AlertasView.vue'),
  },
  {
    path: '/reglas',
    name: 'thorondor-monitorization-rules',
    component: () => import('../views/Thorondor/Thorondor-ReglasMonitorizacionView.vue'),
  },
  {
    path: '/respuesta-inteligente',
    name: 'thorondor-smart-response',
    component: () => import('../views/Thorondor/Thorondor-RespuestaInteligenteView.vue'),
  },
  {
    path: '/bloqueo-ips',
    name: 'thorondor-ip-blocks',
    component: () => import('../views/Thorondor/Thorondor-BloqueoIpsView.vue'),
  },
  {
    path: '/comandos',
    name: 'thorondor-command-audit',
    component: () => import('../views/Thorondor/Thorondor-ComandosEjecutadosView.vue'),
  },
  {
    path: '/casos',
    name: 'thorondor-cases',
    component: () => import('../views/Thorondor/Thorondor-CasosView.vue'),
  },
  {
    path: '/agentes',
    name: 'thorondor-agents',
    component: () => import('../views/Thorondor/Thorondor-AgentesView.vue'),
  },
  {
    path: '/hosts',
    redirect: { name: 'thorondor-agents' },
  },
  {
    path: '/ajustes',
    name: 'thorondor-user-settings',
    component: () => import('../views/Thorondor/Thorondor-AjustesUsuarioView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'thorondor-login' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    return {
      top: 0,
      behavior: 'smooth',
    }
  },
})

router.beforeEach(async (to) => {
  const isPublicRoute = to.matched.some((record) => record.meta.authLayout === true)

  if (isPublicRoute) {
    return true
  }

  try {
    const session = await fetchThorondorSession()
    if (session?.authenticated) {
      return true
    }
  } catch {
    // Si la API no puede validar la sesión, no se monta ninguna vista privada.
  }

  return {
    name: 'thorondor-login',
    query: to.fullPath && to.fullPath !== '/' ? { next: to.fullPath } : undefined,
  }
})

export default router
