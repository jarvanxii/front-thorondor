<template>
  <footer class="thorondor-mini-footer" aria-label="Información de plataforma">
    <div class="footer-brand">
      <strong>Thorondor</strong>
      <span>Consola SIEM para hosts autorizados</span>
    </div>

    <div class="footer-meta" aria-label="Información operativa">
      <span>Operación privada</span>
      <span>Seguridad y trazabilidad</span>
      <span>© 2026</span>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'ThorondorMiniFooter',
}
</script>

<style scoped>
.thorondor-mini-footer {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(260px, auto);
  gap: clamp(18px, 2vw, 34px);
  align-items: center;
  width: 100%;
  margin: 18px 0 0;
  padding: 16px clamp(22px, 2.6vw, 40px);
  border-top: 1px solid rgba(214, 161, 92, 0.2);
  background:
    linear-gradient(135deg, rgba(17, 25, 35, 0.98), rgba(8, 13, 21, 0.99)),
    #101824;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.026);
  color: #a8b8c8;
  font-family: 'Inter', sans-serif;
}

.footer-brand {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: baseline;
  min-width: 0;
}

.footer-brand strong {
  color: #f0c77e;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.footer-brand span {
  color: #a8b8c8;
  font-size: 0.76rem;
  line-height: 1.4;
}

.footer-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0;
  align-items: center;
  color: #9fb0c2;
  font-size: 0.72rem;
  line-height: 1.5;
}

.footer-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  color: inherit;
  font-weight: 600;
  letter-spacing: 0;
  white-space: nowrap;
}

.footer-meta span + span::before {
  content: '';
  width: 1px;
  height: 12px;
  margin: 0 12px;
  background: rgba(214, 161, 92, 0.3);
}

@media (max-width: 980px) {
  .thorondor-mini-footer {
    grid-template-columns: 1fr;
    gap: 10px;
    align-items: start;
  }

  .footer-meta {
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .thorondor-mini-footer {
    padding: 16px;
  }

  .footer-brand,
  .footer-meta {
    display: grid;
    gap: 4px;
  }

  .footer-meta span + span::before {
    display: none;
  }
}
</style>
