<template>
  <footer class="thorondor-mini-footer" aria-label="Información de plataforma">
    <div class="footer-brand">
      <strong>Thorondor</strong>
      <span>Consola SIEM para hosts autorizados</span>
    </div>

    <div class="footer-status" aria-label="Estado operativo">
      <span>Operación privada</span>
      <span>Seguridad y trazabilidad</span>
      <span>2026</span>
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
  gap: clamp(16px, 2vw, 32px);
  align-items: center;
  width: 100%;
  margin: 16px 0 0;
  padding: 14px clamp(20px, 2.4vw, 36px);
  border-top: 1px solid rgba(214, 161, 92, 0.22);
  background:
    linear-gradient(135deg, rgba(18, 24, 31, 0.96), rgba(14, 18, 24, 0.98)),
    var(--thorondor-panel-background);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 -12px 32px rgba(0, 0, 0, 0.18);
  color: #aeb8c4;
  font-family: 'Inter', sans-serif;
}

.footer-brand {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.footer-brand strong {
  color: #f0c77e;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.footer-brand span {
  color: #b1bdc9;
  font-size: 0.75rem;
}

.footer-status {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

.footer-status span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 6px 10px;
  border: 1px solid rgba(177, 189, 201, 0.16);
  border-radius: 999px;
  color: #c1cad5;
  background: rgba(255, 255, 255, 0.025);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .thorondor-mini-footer {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .footer-status {
    justify-content: flex-start;
  }
}

@media (max-width: 560px) {
  .thorondor-mini-footer {
    padding: 16px 14px;
  }

  .footer-status {
    gap: 6px;
  }

  .footer-status span {
    min-height: 26px;
    padding: 5px 8px;
    font-size: 0.64rem;
  }
}
</style>
