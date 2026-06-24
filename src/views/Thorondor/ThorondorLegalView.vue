<template>
  <main class="legal-page">
    <section class="legal-shell" aria-labelledby="legal-title">
      <article class="legal-card">
        <nav class="legal-topbar" aria-label="Navegación legal">
          <RouterLink :to="{ name: 'thorondor-login' }" class="legal-brand" aria-label="Volver al login">
            <img :src="brandLogo" alt="Thorondor SIEM" />
          </RouterLink>

          <RouterLink :to="{ name: 'thorondor-login' }" class="legal-access-link">Acceso</RouterLink>
        </nav>

        <header class="legal-header">
          <span v-if="page.kicker" class="section-kicker">{{ page.kicker }}</span>
          <h1 id="legal-title">{{ page.title }}</h1>
          <p>{{ page.intro }}</p>
          <div v-if="showLegalMeta" class="legal-meta">
            <small>Última actualización: 10/06/2026</small>
            <a :href="`mailto:${ownerEmail}`">{{ ownerEmail }}</a>
          </div>
        </header>

        <div class="legal-content">
          <section
            v-for="(section, index) in page.sections"
            :id="`legal-section-${index}`"
            :key="section.title"
            class="legal-section"
          >
            <h2>{{ section.title }}</h2>
            <div class="legal-section-copy">
              <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
            </div>
          </section>

          <section v-if="showContactForm" class="legal-contact" aria-labelledby="contact-title">
            <div class="legal-contact-copy">
              <h2 id="contact-title">Enviar mensaje</h2>
              <p>
                Escribe a <a :href="`mailto:${ownerEmail}`">{{ ownerEmail }}</a> o usa el formulario.
              </p>
              <p>No envíes contraseñas, tokens ni claves privadas.</p>
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

              <label class="legal-field legal-field--wide" for="contact-subject">
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
                  placeholder="Describe tu consulta."
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
        </div>

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
      'Aquí se resume qué datos usa Thorondor, para qué los usa y cómo puedes contactar.',
    links: [
      { route: 'thorondor-terms', label: 'Términos del servicio' },
      { route: 'thorondor-contact', label: 'Contacto' },
    ],
    sections: [
      {
        title: 'Responsable y contacto',
        paragraphs: [
          'Thorondor SIEM es una plataforma privada para entornos propios o expresamente autorizados.',
          'Para dudas sobre privacidad, seguridad o acceso, usa la página de contacto.',
        ],
      },
      {
        title: 'Datos que se tratan',
        paragraphs: [
          'La plataforma puede guardar email, nombre visible, proveedor de acceso, fechas de alta y último acceso, y permisos de usuario.',
          'Si accedes con Google u otro proveedor externo, sólo se usa la información básica necesaria para identificarte.',
        ],
      },
      {
        title: 'Finalidad',
        paragraphs: [
          'Los datos se usan para iniciar sesión, proteger la cuenta, aplicar permisos, recuperar el acceso y mantener un registro técnico de actividad.',
        ],
      },
      {
        title: 'Cookies y datos locales',
        paragraphs: [
          'Thorondor usa cookies técnicas y datos locales del navegador para mantener la sesión, recordar preferencias y mostrar avisos necesarios.',
          'No se usan cookies publicitarias ni seguimiento comercial.',
        ],
      },
      {
        title: 'Conservación y seguridad',
        paragraphs: [
          'Los datos se conservan mientras la cuenta exista o mientras sean necesarios por seguridad.',
          'Las contraseñas no se guardan en texto claro y los códigos temporales caducan.',
        ],
      },
      {
        title: 'Comunicaciones por email',
        paragraphs: [
          'Thorondor puede enviarte correos necesarios para crear la cuenta, verificar el acceso o recuperar la contraseña.',
          'No se usan estos correos para marketing.',
        ],
      },
      {
        title: 'Derechos del usuario',
        paragraphs: [
          'Puedes pedir revisión, corrección o baja de tus datos desde la página de contacto.',
          'Si se elimina la cuenta, puede perderse el acceso a la plataforma.',
        ],
      },
    ],
  },
  'thorondor-terms': {
    kicker: 'Condiciones',
    title: 'Términos del servicio',
    intro:
      'Estas condiciones explican el uso permitido de Thorondor mientras la plataforma evoluciona.',
    links: [
      { route: 'thorondor-privacy', label: 'Política de privacidad' },
      { route: 'thorondor-contact', label: 'Contacto' },
    ],
    sections: [
      {
        title: 'Objeto del servicio',
        paragraphs: [
          'Thorondor SIEM ayuda a revisar hosts, eventos, reglas, alertas y acciones de respuesta en infraestructura propia o autorizada.',
          'No debe usarse sobre sistemas de terceros sin permiso.',
        ],
      },
      {
        title: 'Estado de desarrollo',
        paragraphs: [
          'Thorondor está en desarrollo activo. Algunas funciones pueden cambiar, no estar disponibles o necesitar autorización manual.',
          'El acceso con proveedores externos se activará de forma progresiva.',
        ],
      },
      {
        title: 'Cuentas y permisos',
        paragraphs: [
          'Las cuentas nuevas pueden necesitar aprobación antes de acceder a todas las funciones.',
          'Los permisos pueden ajustarse o retirarse cuando sea necesario.',
        ],
      },
      {
        title: 'Uso aceptable',
        paragraphs: [
          'Cuida tus credenciales, no compartas tokens y cierra sesión cuando uses equipos compartidos.',
          'Está prohibido usar Thorondor para acceder, analizar, bloquear o modificar sistemas sin autorización.',
        ],
      },
      {
        title: 'Disponibilidad y responsabilidad',
        paragraphs: [
          'Durante el desarrollo puede haber interrupciones o errores.',
          'Las acciones sobre sistemas reales deben revisarse antes de ejecutarse.',
        ],
      },
      {
        title: 'Cambios',
        paragraphs: [
          'Estas condiciones pueden actualizarse cuando cambie la plataforma.',
          'El uso continuado implica aceptar la versión publicada en thorondor.app.',
        ],
      },
    ],
  },
  'thorondor-contact': {
    kicker: '',
    title: 'Contacto',
    intro:
      'Para consultas sobre privacidad, acceso, seguridad o uso autorizado de Thorondor.',
    links: [
      { route: 'thorondor-privacy', label: 'Política de privacidad' },
      { route: 'thorondor-terms', label: 'Términos del servicio' },
    ],
    sections: [],
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

    showLegalMeta() {
      return this.$route.name !== 'thorondor-contact'
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

/* Simplified legal presentation */
.legal-page {
  background:
    linear-gradient(180deg, rgba(5, 9, 8, 0.05), rgba(5, 9, 8, 0.4)),
    var(--thorondor-grid-background);
  background-size: auto, var(--thorondor-grid-background-size);
}

.legal-shell {
  width: min(100%, 940px);
  padding: clamp(18px, 3vw, 42px) clamp(14px, 3vw, 28px) 54px;
}

.legal-card {
  gap: 0;
  overflow: hidden;
  padding: 0;
  border-color: rgba(236, 194, 119, 0.18);
  background:
    linear-gradient(145deg, rgba(236, 194, 119, 0.035), transparent 34%),
    var(--thorondor-panel-background);
}

.legal-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(18px, 3vw, 30px);
  border-bottom: 1px solid rgba(176, 184, 194, 0.13);
  background: rgba(3, 7, 10, 0.32);
}

.legal-brand img {
  display: block;
  width: clamp(102px, 11vw, 124px);
  height: auto;
}

.legal-access-link,
.legal-footer a {
  min-height: 34px;
  padding: 9px 12px;
  border: 1px solid rgba(176, 184, 194, 0.16);
  border-radius: 4px;
  background: rgba(8, 12, 17, 0.34);
  color: #cbd7e5;
  font-size: 0.78rem;
  font-weight: 820;
  text-decoration: none;
}

.legal-access-link:hover,
.legal-footer a:hover,
.legal-footer a.router-link-active {
  border-color: rgba(236, 194, 119, 0.5);
  background: rgba(214, 161, 92, 0.1);
  color: #f3cf8c;
}

.legal-header {
  gap: 10px;
  padding: clamp(26px, 4vw, 42px) clamp(20px, 4vw, 42px);
  border-bottom: 1px solid rgba(236, 194, 119, 0.13);
}

.legal-header h1 {
  max-width: 720px;
  font-size: clamp(2.05rem, 4.5vw, 3.55rem);
  letter-spacing: 0;
}

.legal-header > p {
  max-width: 720px;
  color: #d8e1eb;
  font-size: clamp(1rem, 1.5vw, 1.1rem);
}

.legal-meta {
  margin-top: 6px;
}

.legal-content {
  display: grid;
  padding: clamp(20px, 3vw, 34px) clamp(20px, 4vw, 42px);
}

.legal-section {
  grid-template-columns: minmax(150px, 0.34fr) minmax(0, 1fr);
  gap: clamp(14px, 3vw, 28px);
  align-items: start;
  padding: 21px 0;
  border-top: 1px solid rgba(176, 184, 194, 0.12);
}

.legal-section:first-child {
  padding-top: 0;
  border-top: 0;
}

.legal-section h2 {
  color: #f3cf8c;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.legal-section-copy {
  display: grid;
  gap: 9px;
}

.legal-section-copy p {
  margin: 0;
}

.legal-contact {
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
  margin-top: 18px;
  border-color: rgba(176, 184, 194, 0.15);
  background: rgba(8, 12, 17, 0.46);
}

.legal-content > .legal-contact:first-child {
  margin-top: 0;
}

.legal-footer {
  margin: 0 clamp(20px, 4vw, 42px);
  padding: 18px 0 clamp(20px, 3vw, 28px);
}

@media (max-width: 820px) {
  .legal-shell {
    padding: 0;
  }

  .legal-card {
    min-height: 100vh;
    min-height: 100svh;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .legal-topbar {
    padding: 13px 16px;
  }

  .legal-brand img {
    width: 98px;
  }

  .legal-access-link {
    min-height: 34px;
    padding-inline: 12px;
    white-space: nowrap;
  }

  .legal-header {
    padding: 24px 18px 22px;
  }

  .legal-header h1 {
    font-size: clamp(1.9rem, 9vw, 2.7rem);
  }

  .legal-content {
    padding: 22px 18px 28px;
  }

  .legal-section {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 20px 0;
  }

  .legal-contact {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .legal-contact-form,
  .legal-contact-actions {
    grid-template-columns: 1fr;
  }

  .legal-contact-submit {
    width: 100%;
  }

  .legal-footer {
    margin: 0 18px;
  }
}

@media (max-width: 480px) {
  .legal-meta,
  .legal-footer {
    display: grid;
  }

  .legal-footer {
    gap: 8px;
  }

  .legal-footer a {
    min-height: 36px;
    text-align: center;
  }
}
</style>
