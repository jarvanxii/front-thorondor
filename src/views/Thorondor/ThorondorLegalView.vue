<template>
  <main class="legal-page">
    <section class="legal-shell" aria-labelledby="legal-title">
      <RouterLink :to="{ name: 'thorondor-login' }" class="legal-brand" aria-label="Volver al login">
        <img :src="brandLogo" alt="Thorondor SIEM" />
      </RouterLink>

      <article class="legal-card">
        <header class="legal-header">
          <span class="section-kicker">{{ page.kicker }}</span>
          <h1 id="legal-title">{{ page.title }}</h1>
          <p>{{ page.intro }}</p>
          <div class="legal-meta">
            <small>Última actualización: 10/06/2026</small>
            <a :href="`mailto:${ownerEmail}`">{{ ownerEmail }}</a>
          </div>
        </header>

        <section v-for="section in page.sections" :key="section.title" class="legal-section">
          <h2>{{ section.title }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </section>

        <section v-if="showContactForm" class="legal-contact" aria-labelledby="contact-title">
          <div class="legal-contact-copy">
            <span class="section-kicker">Contacto</span>
            <h2 id="contact-title">Contactar con el administrador</h2>
            <p>
              Usa este formulario para consultas sobre privacidad, acceso, incidencias o uso de la
              plataforma. El mensaje se enviará por el servicio SMTP de Thorondor al administrador.
            </p>
            <p>
              También puedes escribir directamente a
              <a :href="`mailto:${ownerEmail}`">{{ ownerEmail }}</a>.
            </p>
          </div>

          <form class="legal-contact-form" @submit.prevent="submitContact">
            <label class="legal-field" for="contact-name">
              <span>Nombre</span>
              <input
                id="contact-name"
                v-model.trim="contactForm.name"
                autocomplete="name"
                maxlength="120"
                placeholder="Tu nombre"
                type="text"
              />
            </label>

            <label class="legal-field" for="contact-email">
              <span>Email</span>
              <input
                id="contact-email"
                v-model.trim="contactForm.email"
                autocomplete="email"
                inputmode="email"
                maxlength="320"
                placeholder="tu@email.com"
                required
                type="email"
              />
            </label>

            <label class="legal-field" for="contact-subject">
              <span>Asunto</span>
              <input
                id="contact-subject"
                v-model.trim="contactForm.subject"
                maxlength="160"
                placeholder="Consulta sobre Thorondor"
                type="text"
              />
            </label>

            <label class="legal-field legal-field--wide" for="contact-message">
              <span>Mensaje</span>
              <textarea
                id="contact-message"
                v-model.trim="contactForm.message"
                maxlength="3000"
                placeholder="Cuéntame qué necesitas revisar."
                required
                rows="6"
              ></textarea>
            </label>

            <input
              v-model.trim="contactForm.website"
              aria-hidden="true"
              autocomplete="off"
              class="contact-honeypot"
              tabindex="-1"
              type="text"
            />

            <div class="legal-contact-actions">
              <p
                v-if="contactFeedback"
                class="legal-contact-feedback"
                :class="`legal-contact-feedback--${contactFeedbackTone}`"
                role="status"
              >
                {{ contactFeedback }}
              </p>
              <button class="legal-contact-submit" type="submit" :disabled="contactBusy">
                {{ contactBusy ? 'Enviando' : 'Enviar mensaje' }}
              </button>
            </div>
          </form>
        </section>

        <footer class="legal-footer">
          <RouterLink :to="{ name: 'thorondor-login' }">Volver al login</RouterLink>
          <RouterLink v-for="link in page.links" :key="link.route" :to="{ name: link.route }">
            {{ link.label }}
          </RouterLink>
        </footer>
      </article>
    </section>
  </main>
</template>

<script>
import brandLogo from '@/assets/images/brand/logo_completo_thorondor.png'
import { sendThorondorContactMessage } from '@/features/thorondor/services/thorondorAuth'

const ownerEmail = 'JarvanXII@gmail.com'

const pages = {
  'thorondor-privacy': {
    kicker: 'Privacidad',
    title: 'Política de privacidad',
    intro:
      'Esta política explica qué datos trata Thorondor SIEM cuando una persona crea una cuenta, inicia sesión o utiliza la consola.',
    links: [
      { route: 'thorondor-terms', label: 'Términos del servicio' },
      { route: 'thorondor-contact', label: 'Contacto' },
    ],
    sections: [
      {
        title: 'Responsable y contacto',
        paragraphs: [
          'Thorondor SIEM es una plataforma privada de monitorización y respuesta para infraestructura propia o expresamente autorizada.',
          `El administrador y propietario de la plataforma atiende consultas en ${ownerEmail}. Este canal se usa para privacidad, seguridad, acceso y solicitudes relacionadas con la cuenta.`,
        ],
      },
      {
        title: 'Datos que se tratan',
        paragraphs: [
          'La plataforma puede tratar email, nombre visible, proveedor de autenticación, identificador del proveedor, fecha de alta, fecha de último acceso y permisos internos de usuario.',
          'Si el usuario accede con Google u otro proveedor externo, Thorondor solo solicita datos básicos de identidad: email, perfil y nombre visible. No solicita acceso a Gmail, Drive ni otros servicios sensibles.',
        ],
      },
      {
        title: 'Finalidad',
        paragraphs: [
          'Los datos se usan para autenticar usuarios, mantener sesiones seguras, aplicar permisos, permitir recuperación de acceso y auditar operaciones dentro de la consola.',
          'Los usuarios no autorizados no pueden usar persistencia en base de datos a través de la API; su uso queda limitado a la persistencia local permitida por la aplicación.',
        ],
      },
      {
        title: 'Cookies e IndexedDB',
        paragraphs: [
          'Thorondor utiliza cookies técnicas necesarias para mantener la sesión, proteger el acceso y validar las peticiones a la API. No se usan cookies publicitarias ni seguimiento comercial de terceros.',
          'La aceptación del aviso de cookies y determinadas preferencias locales se conservan en IndexedDB del navegador para no repetir avisos y para mantener la experiencia operativa de la consola.',
        ],
      },
      {
        title: 'Conservación y seguridad',
        paragraphs: [
          'Las contraseñas locales se guardan como hash, no en texto claro. Los tokens y códigos de verificación tienen caducidad.',
          'Los datos se conservan mientras la cuenta exista o mientras sean necesarios para trazabilidad técnica y seguridad de la plataforma.',
        ],
      },
      {
        title: 'Comunicaciones por email',
        paragraphs: [
          'Thorondor envía correos transaccionales para registro, verificación, recuperación de acceso y contacto administrativo. No se usan estos correos para marketing.',
          'El dominio thorondor.app usa autenticación de email mediante SPF, DKIM y DMARC para mejorar la entrega y reducir suplantación.',
        ],
      },
      {
        title: 'Derechos del usuario',
        paragraphs: [
          `Un usuario puede solicitar revisión, corrección o baja de sus datos escribiendo a ${ownerEmail} o desde la página de contacto.`,
          'La baja puede limitar o impedir el acceso a la consola y a la información asociada al usuario.',
        ],
      },
    ],
  },
  'thorondor-terms': {
    kicker: 'Condiciones',
    title: 'Términos del servicio',
    intro:
      'Estos términos regulan el acceso y uso de Thorondor SIEM mientras la plataforma permanece en desarrollo activo.',
    links: [
      { route: 'thorondor-privacy', label: 'Política de privacidad' },
      { route: 'thorondor-contact', label: 'Contacto' },
    ],
    sections: [
      {
        title: 'Objeto del servicio',
        paragraphs: [
          'Thorondor SIEM permite revisar hosts, eventos, reglas, alertas y acciones de respuesta sobre infraestructura propia o autorizada.',
          'La plataforma no debe utilizarse para monitorizar sistemas de terceros sin autorización expresa.',
        ],
      },
      {
        title: 'Estado de desarrollo',
        paragraphs: [
          'Thorondor está en fase activa de desarrollo. Algunas funciones pueden cambiar, estar desactivadas o requerir autorización manual.',
          'El acceso externo con proveedores OAuth puede habilitarse progresivamente según configuración y validación de cada proveedor.',
        ],
      },
      {
        title: 'Cuentas y permisos',
        paragraphs: [
          'Las cuentas nuevas se crean sin permisos de administrador y sin autorización para persistencia en base de datos.',
          'Solo un usuario administrador puede marcar una cuenta como autorizada o cambiar permisos internos.',
        ],
      },
      {
        title: 'Uso aceptable',
        paragraphs: [
          'El usuario debe custodiar sus credenciales, no compartir tokens y cerrar sesión cuando use equipos compartidos.',
          'Queda prohibido usar la plataforma para acceder, bloquear, modificar o analizar sistemas sin permiso del propietario.',
        ],
      },
      {
        title: 'Disponibilidad y responsabilidad',
        paragraphs: [
          'Durante el desarrollo no se garantiza disponibilidad continua ni ausencia de errores.',
          'Las acciones de respuesta, comandos y bloqueos deben revisarse antes de ejecutarse sobre sistemas reales.',
        ],
      },
      {
        title: 'Cambios',
        paragraphs: [
          'Estos términos pueden actualizarse cuando evolucione la plataforma, cambien los proveedores de autenticación o se complete la preparación de producción.',
          'El uso continuado de la plataforma implica aceptar la versión vigente publicada en thorondor.app.',
        ],
      },
    ],
  },
  'thorondor-contact': {
    kicker: 'Contacto',
    title: 'Contacto administrativo',
    intro:
      'Canal directo para consultas sobre privacidad, acceso, seguridad o uso autorizado de Thorondor SIEM.',
    links: [
      { route: 'thorondor-privacy', label: 'Política de privacidad' },
      { route: 'thorondor-terms', label: 'Términos del servicio' },
    ],
    sections: [
      {
        title: 'Administrador de la plataforma',
        paragraphs: [
          `El correo de contacto del administrador y propietario de Thorondor es ${ownerEmail}.`,
          'El formulario inferior envía el mensaje mediante el servicio SMTP configurado en la API de Thorondor.',
        ],
      },
      {
        title: 'Consultas adecuadas para este canal',
        paragraphs: [
          'Privacidad, protección de datos, revisión o baja de cuenta, incidencias de acceso, seguridad de la plataforma y autorizaciones de uso.',
          'No envíes contraseñas, tokens, claves privadas ni información sensible que no sea necesaria para tramitar la consulta.',
        ],
      },
    ],
  },
}

export default {
  name: 'ThorondorLegalView',

  data() {
    return {
      brandLogo,
      ownerEmail,
      contactBusy: false,
      contactFeedback: '',
      contactFeedbackTone: 'neutral',
      contactForm: {
        name: '',
        email: '',
        subject: '',
        message: '',
        website: '',
      },
    }
  },

  computed: {
    page() {
      return pages[this.$route.name] || pages['thorondor-privacy']
    },

    showContactForm() {
      return this.$route.name === 'thorondor-contact'
    },
  },

  watch: {
    '$route.name'() {
      this.contactFeedback = ''
      this.contactFeedbackTone = 'neutral'
    },
  },

  methods: {
    async submitContact() {
      if (this.contactBusy) return

      this.contactFeedback = ''
      this.contactFeedbackTone = 'neutral'

      if (!this.contactForm.email || !this.contactForm.message) {
        this.contactFeedback = 'Introduce tu email y un mensaje para poder enviar la consulta.'
        this.contactFeedbackTone = 'error'
        return
      }

      this.contactBusy = true

      try {
        await sendThorondorContactMessage(this.contactForm)
        this.contactFeedback = 'Mensaje enviado. Te responderé en cuanto pueda revisarlo.'
        this.contactFeedbackTone = 'success'
        this.contactForm = {
          name: '',
          email: '',
          subject: '',
          message: '',
          website: '',
        }
      } catch (error) {
        this.contactFeedback =
          error?.message || 'No se pudo enviar el mensaje. Revisa el email e inténtalo de nuevo.'
        this.contactFeedbackTone = 'error'
      } finally {
        this.contactBusy = false
      }
    },
  },
}
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: var(--thorondor-grid-background);
  background-size: var(--thorondor-grid-background-size);
  color: #f8fafc;
  font-family: 'Inter', sans-serif;
}

.legal-shell {
  display: grid;
  gap: 18px;
  width: min(100%, 980px);
  margin: 0 auto;
  padding: clamp(22px, 3vw, 42px) clamp(16px, 3vw, 28px) 52px;
}

.legal-brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  text-decoration: none;
}

.legal-brand img {
  width: min(218px, 58vw);
  height: auto;
}

.legal-card {
  display: grid;
  gap: 18px;
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid rgba(236, 194, 119, 0.22);
  border-radius: 6px;
  background: var(--thorondor-panel-background);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 18px 40px rgba(0, 0, 0, 0.28);
}

.legal-header,
.legal-section,
.legal-contact-copy {
  display: grid;
  gap: 8px;
}

.section-kicker {
  color: #d6a15c;
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: uppercase;
}

.legal-header h1,
.legal-section h2,
.legal-contact h2,
.legal-header p,
.legal-section p,
.legal-contact p {
  margin: 0;
}

.legal-header h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.04;
}

.legal-header p,
.legal-section p,
.legal-contact p {
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.66;
}

.legal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  color: #8ea2b7;
  font-size: 0.86rem;
}

.legal-meta small {
  color: inherit;
  font-size: inherit;
}

.legal-meta a,
.legal-contact a {
  color: #f3cf8c;
  font-weight: 820;
  text-decoration: none;
}

.legal-meta a:hover,
.legal-contact a:hover {
  color: #ffe3aa;
}

.legal-section {
  padding-top: 16px;
  border-top: 1px solid rgba(236, 194, 119, 0.14);
}

.legal-section h2,
.legal-contact h2 {
  color: #f8fafc;
  font-size: 1.12rem;
  line-height: 1.25;
}

.legal-contact {
  display: grid;
  grid-template-columns: minmax(240px, 0.78fr) minmax(320px, 1fr);
  gap: clamp(18px, 3vw, 30px);
  align-items: start;
  padding: clamp(18px, 2.5vw, 26px);
  border: 1px solid rgba(236, 194, 119, 0.2);
  border-radius: 6px;
  background:
    linear-gradient(135deg, rgba(214, 161, 92, 0.08), transparent 46%),
    rgba(7, 11, 16, 0.55);
}

.legal-contact-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.legal-field {
  display: grid;
  gap: 6px;
}

.legal-field--wide,
.legal-contact-actions {
  grid-column: 1 / -1;
}

.legal-field span {
  color: #e5edf6;
  font-size: 0.82rem;
  font-weight: 850;
}

.legal-field input,
.legal-field textarea {
  width: 100%;
  border: 1px solid rgba(176, 184, 194, 0.24);
  border-radius: 4px;
  background: rgba(2, 6, 10, 0.62);
  color: #f8fafc;
  font: inherit;
  font-size: 0.94rem;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.legal-field input {
  min-height: 42px;
  padding: 0 12px;
}

.legal-field textarea {
  min-height: 132px;
  padding: 11px 12px;
  resize: vertical;
}

.legal-field input::placeholder,
.legal-field textarea::placeholder {
  color: #71859b;
}

.legal-field input:focus,
.legal-field textarea:focus {
  border-color: rgba(236, 194, 119, 0.58);
  box-shadow: 0 0 0 3px rgba(214, 161, 92, 0.12);
}

.contact-honeypot {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.legal-contact-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.legal-contact-feedback {
  margin: 0;
  color: #aebdcd;
  font-size: 0.88rem;
  font-weight: 760;
}

.legal-contact-feedback--success {
  color: #72e4aa;
}

.legal-contact-feedback--error {
  color: #ff9f9f;
}

.legal-contact-submit {
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(236, 194, 119, 0.72);
  border-radius: 4px;
  background: linear-gradient(180deg, #f4d08f, #c88935);
  color: #10100d;
  font-weight: 900;
}

.legal-contact-submit:disabled {
  cursor: wait;
  filter: grayscale(0.35);
  opacity: 0.72;
}

.legal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(236, 194, 119, 0.14);
}

.legal-footer a {
  min-height: 38px;
  padding: 10px 14px;
  border: 1px solid rgba(236, 194, 119, 0.28);
  border-radius: 4px;
  color: #f3cf8c;
  font-weight: 850;
  text-decoration: none;
}

.legal-footer a:hover {
  border-color: rgba(236, 194, 119, 0.58);
  background: rgba(214, 161, 92, 0.1);
}

@media (max-width: 820px) {
  .legal-contact {
    grid-template-columns: 1fr;
  }

  .legal-contact-form,
  .legal-contact-actions {
    grid-template-columns: 1fr;
  }

  .legal-contact-submit {
    width: 100%;
  }
}
</style>
