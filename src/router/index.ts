import { createRouter, createWebHashHistory } from 'vue-router'

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
    path: '/auth/callback',
    name: 'thorondor-auth-callback',
    component: () => import('../views/Thorondor/ThorondorAuthCallbackView.vue'),
    meta: { authLayout: true },
  },
  {
    path: '/thorondor',
    name: 'thorondor-information',
    component: () => import('../views/Thorondor/ThorondorView.vue'),
  },
  {
    path: '/thorondor/guia-de-instalacion',
    name: 'thorondor-installation-guide',
    component: () => import('../views/Thorondor/Thorondor-GuiaInstalacionView.vue'),
  },
  {
    path: '/thorondor/generador-de-agentes',
    name: 'thorondor-agent-generator',
    component: () => import('../views/Thorondor/Thorondor-GeneradorAgentesView.vue'),
  },
  {
    path: '/thorondor/dashboard-general',
    name: 'thorondor-dashboard',
    component: () => import('../views/Thorondor/Thorondor-DashboardView.vue'),
  },
  {
    path: '/thorondor/eventos',
    name: 'thorondor-events',
    component: () => import('../views/Thorondor/Thorondor-EventosView.vue'),
  },
  {
    path: '/thorondor/detalle-de-hosts',
    name: 'thorondor-host-detail',
    component: () => import('../views/Thorondor/Thorondor-DetalleHostsView.vue'),
  },
  {
    path: '/thorondor/alertas',
    name: 'thorondor-alerts',
    component: () => import('../views/Thorondor/Thorondor-AlertasView.vue'),
  },
  {
    path: '/thorondor/reglas-de-monitorizacion',
    name: 'thorondor-monitorization-rules',
    component: () => import('../views/Thorondor/Thorondor-ReglasMonitorizacionView.vue'),
  },
  {
    path: '/thorondor/bloqueo-de-ips',
    name: 'thorondor-ip-blocks',
    component: () => import('../views/Thorondor/Thorondor-BloqueoIpsView.vue'),
  },
  {
    path: '/thorondor/comandos-ejecutados',
    name: 'thorondor-command-audit',
    component: () => import('../views/Thorondor/Thorondor-ComandosEjecutadosView.vue'),
  },
  {
    path: '/thorondor/casos',
    name: 'thorondor-cases',
    component: () => import('../views/Thorondor/Thorondor-CasosView.vue'),
  },
  {
    path: '/thorondor/agentes',
    name: 'thorondor-agents',
    component: () => import('../views/Thorondor/Thorondor-AgentesView.vue'),
  },
  {
    path: '/thorondor/ajustes-de-usuario',
    name: 'thorondor-user-settings',
    component: () => import('../views/Thorondor/Thorondor-AjustesUsuarioView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'thorondor-information' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
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

export default router
