<template>
    <ThorondorPageShell>
        <section class="section-box intro-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Análisis por host</span>
                    <h1 class="section-name">Detalle por host</h1>
                    <p class="section-copy">
                        Selecciona un agente para inspeccionar sus métricas, procesos, timeline de seguridad, logs,
                        alertas e histórico. Esta vista concentra la investigación operativa de cada sistema.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Deep Dive</span>
                    <small>{{ selectedAgent ? selectedAgent.displayName : "Sin sistema seleccionado" }}</small>
                </div>
            </div>
        </section>

        <section class="section-box">
            <div class="control-grid compact-grid">
                <div class="control-field">
                    <label class="field-label" for="selected-agent">Sistema</label>
                    <select id="selected-agent" class="form-select input-dark" :value="selectedAgentId" @change="selectAgentAndSync($event.target.value)">
                        <option v-for="agent in dashboardCards" :key="agent.id" :value="agent.id">
                            {{ agent.displayName }} · {{ agent.systemName }}
                        </option>
                    </select>
                </div>
                <div class="control-field">
                    <label class="field-label" for="history-range">Rango histórico</label>
                    <select id="history-range" v-model.number="historyRangeDays" class="form-select input-dark">
                        <option :value="1">Ultimas 24 horas</option>
                        <option :value="7">Últimos 7 días</option>
                        <option :value="30">Últimos 30 días</option>
                    </select>
                </div>
            </div>

            <div v-if="selectedAgent" class="detail-tabs">
                <button v-for="tab in detailTabs" :key="tab.id" class="detail-tab" :class="{ active: detailTab === tab.id }" @click="detailTab = tab.id">
                    {{ tab.label }}
                </button>
            </div>
        </section>

        <section v-if="selectedAgent && detailTab === 'overview'" class="section-box">
            <div class="row g-3 mb-4">
                <div class="col-md-6 col-xl-3" v-for="item in selectedOverviewCards" :key="item.label">
                    <div class="signal-card">
                        <label>{{ item.label }}</label>
                        <span :class="item.tone">{{ item.value }}</span>
                        <small>{{ item.note }}</small>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4" v-if="selectedLatestSnapshot?.disks?.length">
                <div class="card-head">
                    <h5>Particiones de disco</h5>
                    <span class="mini-badge">{{ selectedLatestSnapshot.disks.length }} partición{{ selectedLatestSnapshot.disks.length !== 1 ? 'es' : '' }}</span>
                </div>
                <div class="table-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Dispositivo</th>
                                <th>Punto de montaje</th>
                                <th>Tipo</th>
                                <th>Uso</th>
                                <th>Usado</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="disk in selectedLatestSnapshot.disks" :key="disk.mountpoint">
                                <td><code class="small-code">{{ disk.device }}</code></td>
                                <td><code class="small-code">{{ disk.mountpoint }}</code></td>
                                <td><span class="mini-badge">{{ disk.fstype }}</span></td>
                                <td>
                                    <div class="disk-bar-row">
                                        <div class="disk-bar-track">
                                            <div class="disk-bar-fill" :style="{ width: (disk.percent || 0) + '%', background: diskBarColor(disk.percent) }"></div>
                                        </div>
                                        <span class="disk-bar-pct">{{ (disk.percent || 0).toFixed(1) }}%</span>
                                    </div>
                                </td>
                                <td>{{ formatBytes(disk.used) }}</td>
                                <td>{{ formatBytes(disk.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tool-card mb-4" v-if="selectedLatestSnapshot?.temperatures?.length">
                <div class="card-head">
                    <h5>Sensores de temperatura</h5>
                    <span class="mini-badge">{{ selectedLatestSnapshot.temperatures.length }} sensor{{ selectedLatestSnapshot.temperatures.length !== 1 ? 'es' : '' }}</span>
                </div>
                <div class="temp-grid">
                    <div v-for="sensor in selectedLatestSnapshot.temperatures" :key="`${sensor.source}-${sensor.label}`" class="temp-card">
                        <div class="temp-card-source">
                            <code class="small-code">{{ sensor.source }}</code>
                            <span v-if="sensor.label && sensor.label !== sensor.source" class="mini-badge temp-label-badge">{{ sensor.label }}</span>
                        </div>
                        <div class="temp-reading" :class="tempColorClass(sensor.current)">
                            {{ sensor.current != null ? sensor.current.toFixed(1) + '\u00b0C' : 'N/D' }}
                        </div>
                        <div class="disk-bar-track">
                            <div class="disk-bar-fill" :style="{ width: Math.min(Math.max(sensor.current || 0, 0), 120) / 120 * 100 + '%', background: tempBarColor(sensor.current) }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4" v-if="snapshotHardware">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Inventario hardware</h5>
                            <span class="mini-badge">CPU / RAM</span>
                        </div>
                        <dl class="kv-list">
                            <div class="kv-row"><dt>Modelo CPU</dt><dd>{{ snapshotHardware.cpuModel || 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Nucleos fisicos</dt><dd>{{ snapshotHardware.cpuCoresPhysical }}</dd></div>
                            <div class="kv-row"><dt>Nucleos logicos</dt><dd>{{ snapshotHardware.cpuCoresLogical }}</dd></div>
                            <div class="kv-row"><dt>Frecuencia actual</dt><dd>{{ snapshotHardware.cpuFreqMhz ? snapshotHardware.cpuFreqMhz + ' MHz' : 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>RAM total</dt><dd>{{ snapshotHardware.totalRamGb }} GB</dd></div>
                        </dl>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card" v-if="snapshotGpu.length">
                        <div class="card-head">
                            <h5>GPU detectada</h5>
                            <span class="mini-badge">{{ snapshotGpu.length }} GPU</span>
                        </div>
                        <div v-for="gpu in snapshotGpu" :key="gpu.name" class="gpu-card">
                            <div class="kv-list">
                                <div class="kv-row"><dt>Modelo</dt><dd>{{ gpu.name }}</dd></div>
                                <div class="kv-row" v-if="gpu.vramMb"><dt>VRAM</dt><dd>{{ gpu.vramMb }} MB</dd></div>
                                <div class="kv-row" v-if="gpu.vramBytes"><dt>VRAM</dt><dd>{{ formatBytes(gpu.vramBytes) }}</dd></div>
                                <div class="kv-row" v-if="gpu.tempC"><dt>Temperatura</dt><dd :class="tempColorClass(gpu.tempC)">{{ gpu.tempC }}°C</dd></div>
                                <div class="kv-row" v-if="gpu.utilPercent != null"><dt>Utilizacion</dt><dd>{{ gpu.utilPercent }}%</dd></div>
                                <div class="kv-row" v-if="gpu.driver"><dt>Driver</dt><dd>{{ gpu.driver }}</dd></div>
                            </div>
                        </div>
                    </div>
                    <div class="tool-card" v-else-if="snapshotBattery">
                        <div class="card-head">
                            <h5>Batería / UPS</h5>
                            <span class="mini-badge" :class="snapshotBattery.powerPlugged ? 'badge-ok' : 'badge-warn'">{{ snapshotBattery.powerPlugged ? 'AC conectado' : 'Batería' }}</span>
                        </div>
                        <dl class="kv-list">
                            <div class="kv-row"><dt>Nivel</dt><dd :class="snapshotBattery.percent < 20 ? 'tone-danger' : snapshotBattery.percent < 50 ? 'tone-warning' : 'tone-success'">{{ snapshotBattery.percent }}%</dd></div>
                            <div class="kv-row"><dt>Tiempo restante</dt><dd>{{ batteryTimeLabel }}</dd></div>
                        </dl>
                    </div>
                    <div class="tool-card" v-if="snapshotFans.length">
                        <div class="card-head">
                            <h5>Ventiladores</h5>
                            <span class="mini-badge">{{ snapshotFans.length }} fan(s)</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Fuente</th><th>Etiqueta</th><th>RPM</th></tr></thead>
                                <tbody>
                                    <tr v-for="fan in snapshotFans" :key="`${fan.source}-${fan.label}`">
                                        <td><code class="small-code">{{ fan.source }}</code></td>
                                        <td>{{ fan.label }}</td>
                                        <td>{{ fan.rpm }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4">
                <div class="card-head">
                    <h5>Evolucion temporal del sistema seleccionado</h5>
                    <span class="mini-badge">{{ historyRangeDays }}d</span>
                </div>
                <div v-if="uniqueDiskMountpoints.length > 1" class="disk-toggles">
                    <span class="disk-toggle-label">Disco:</span>
                    <button
                        v-for="mp in uniqueDiskMountpoints"
                        :key="mp"
                        class="disk-toggle-btn"
                        :class="{ 'disk-toggle-active': diskToggles[mp] !== false }"
                        :style="{ '--tcol': diskColorMap[mp]?.border }"
                        @click="toggleDiskMountpoint(mp)"
                    >{{ mp }}</button>
                </div>
                <ThorondorLineChart chart-id="thorondor-agent-history-chart" :labels="selectedHistoryChart.labels" :datasets="selectedHistoryChart.datasets" title="CPU, RAM y disco" />
            </div>

            <div class="row g-3">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Procesos más consumidores</h5>
                            <span class="mini-badge">Top 10</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Proceso</th>
                                        <th>PID</th>
                                        <th>Usuario</th>
                                        <th>CPU%</th>
                                        <th>RAM%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="process in topProcesses" :key="`${process.pid}-${process.name}`">
                                        <td>{{ process.name }}</td>
                                        <td>{{ process.pid }}</td>
                                        <td>{{ process.user }}</td>
                                        <td>{{ process.cpuPercent }}</td>
                                        <td>{{ process.memoryPercent }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Interfaces de red y trafico</h5>
                            <span class="mini-badge">NIC</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Interfaz</th>
                                        <th>IPv4</th>
                                        <th>Enviado</th>
                                        <th>Recibido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="iface in selectedLatestSnapshot?.interfaces || []" :key="iface.name">
                                        <td>{{ iface.name }}</td>
                                        <td>{{ formatList(iface.ipv4) }}</td>
                                        <td>{{ formatBytes(iface.bytesSent) }}</td>
                                        <td>{{ formatBytes(iface.bytesRecv) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ TAB RED ═══════════════════════════════════════════════════════ -->
        <section v-else-if="selectedAgent && detailTab === 'network'" class="section-box">
            <div class="tool-card mb-4">
                <div class="card-head">
                    <h5>Velocidad de red en tiempo real</h5>
                    <span class="mini-badge">Bytes/s</span>
                </div>
                <div class="table-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Interfaz</th>
                                <th>TX (envia)</th>
                                <th>RX (recibe)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="rate in snapshotNetworkRates" :key="rate.name">
                                <td><code class="small-code">{{ rate.name }}</code></td>
                                <td>{{ formatBytes(rate.sendBytesPerSec) }}/s</td>
                                <td>{{ formatBytes(rate.recvBytesPerSec) }}/s</td>
                            </tr>
                            <tr v-if="!snapshotNetworkRates.length">
                                <td colspan="3" class="text-muted text-center">Sin datos de velocidad de red. Activa el modulo networkRates en el generador.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tool-card">
                <div class="card-head">
                    <h5>Conexiones TCP establecidas</h5>
                    <span class="mini-badge">{{ snapshotEstablished.length }} ESTABLISHED</span>
                </div>
                <div class="table-wrap scrollable-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Proceso</th>
                                <th>PID</th>
                                <th>Local</th>
                                <th>Remoto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="conn in snapshotEstablished" :key="`${conn.pid}-${conn.remoteAddr}`">
                                <td>{{ conn.process || '—' }}</td>
                                <td>{{ conn.pid }}</td>
                                <td><code class="small-code">{{ conn.localAddr }}</code></td>
                                <td><code class="small-code">{{ conn.remoteAddr }}</code></td>
                            </tr>
                            <tr v-if="!snapshotEstablished.length">
                                <td colspan="4" class="text-muted text-center">Sin conexiones ESTABLISHED activas o modulo desactivado.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- ═══ TAB INFRAESTRUCTURA ══════════════════════════════════════════ -->
        <section v-else-if="selectedAgent && detailTab === 'infra'" class="section-box">
            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Servicios en estado anomalo</h5>
                            <span class="mini-badge" :class="snapshotFailedServices.length ? 'badge-danger' : 'badge-ok'">{{ snapshotFailedServices.length }} FAILED</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Servicio</th><th>Estado</th></tr></thead>
                                <tbody>
                                    <tr v-for="svc in snapshotFailedServices" :key="svc.name">
                                        <td><code class="small-code">{{ svc.name }}</code></td>
                                        <td><span class="state-chip state-chip--danger">{{ svc.activeState }}</span></td>
                                    </tr>
                                    <tr v-if="!snapshotFailedServices.length">
                                        <td colspan="2" class="text-muted text-center">Todos los servicios responden correctamente.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Resolucion DNS</h5>
                            <span class="mini-badge">Conectividad</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Target</th><th>IP resuelta</th><th>Estado</th></tr></thead>
                                <tbody>
                                    <tr v-for="d in snapshotDns" :key="d.target">
                                        <td><code class="small-code">{{ d.target }}</code></td>
                                        <td>{{ d.resolved || '—' }}</td>
                                        <td><span class="state-chip" :class="d.ok ? 'state-chip--ok' : 'state-chip--danger'">{{ d.ok ? 'OK' : 'FAIL' }}</span></td>
                                    </tr>
                                    <tr v-if="!snapshotDns.length">
                                        <td colspan="3" class="text-muted text-center">Sin datos DNS.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Actualizaciones pendientes</h5>
                            <span class="mini-badge" :class="snapshotPendingUpdates.count > 20 ? 'badge-danger' : snapshotPendingUpdates.count > 5 ? 'badge-warn' : 'badge-ok'">{{ snapshotPendingUpdates.count }} paquetes</span>
                        </div>
                        <div v-if="snapshotPendingUpdates.updates?.length" class="output-box" style="max-height:200px;overflow-y:auto;">
                            <pre class="result-pre">{{ snapshotPendingUpdates.updates.join('\n') }}</pre>
                        </div>
                        <div v-else class="empty-box compact-empty">{{ snapshotPendingUpdates.count === 0 ? 'Sistema actualizado.' : 'Lista no disponible.' }}</div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Historial de logins (last)</h5>
                            <span class="mini-badge">{{ snapshotLoginHistory.length }} entradas</span>
                        </div>
                        <div class="output-box scrollable-wrap" style="max-height:200px;">
                            <pre class="result-pre">{{ snapshotLoginHistory.join('\n') || 'Sin historial de logins o modulo desactivado.' }}</pre>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4" v-if="snapshotDocker.length">
                <div class="card-head">
                    <h5>Contenedores Docker</h5>
                    <span class="mini-badge">{{ snapshotDocker.length }} contenedores</span>
                </div>
                <div class="table-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead><tr><th>ID</th><th>Nombre</th><th>Imagen</th><th>Estado</th><th>Puertos</th></tr></thead>
                        <tbody>
                            <tr v-for="c in snapshotDocker" :key="c.id">
                                <td><code class="small-code">{{ c.id }}</code></td>
                                <td>{{ c.name }}</td>
                                <td><code class="small-code">{{ c.image }}</code></td>
                                <td><span class="state-chip" :class="c.status.toLowerCase().includes('up') ? 'state-chip--ok' : 'state-chip--danger'">{{ c.status }}</span></td>
                                <td><code class="small-code">{{ c.ports || '—' }}</code></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tool-card" v-if="snapshotSmartData.length">
                <div class="card-head">
                    <h5>Estado SMART de discos</h5>
                    <span class="mini-badge">{{ snapshotSmartData.length }} disco(s)</span>
                </div>
                <div v-for="disk in snapshotSmartData" :key="disk.device" class="mb-3">
                    <div class="section-kicker mb-1">{{ disk.device }}</div>
                    <dl class="kv-list" v-if="Object.keys(disk.attributes || {}).length">
                        <div class="kv-row" v-for="(val, attr) in disk.attributes" :key="attr">
                            <dt>{{ attr.replace(/_/g, ' ') }}</dt>
                            <dd :class="(attr.includes('Error') || attr.includes('Sector')) && val > 0 ? 'tone-danger' : 'tone-neutral'">{{ val }}</dd>
                        </div>
                    </dl>
                    <p v-else class="text-muted" style="font-size:0.82rem">Sin atributos SMART disponibles para este dispositivo.</p>
                </div>
            </div>
        </section>

        <section v-else-if="selectedAgent && detailTab === 'security'" class="section-box">
            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Logs de autenticación fallidos</h5>
                            <span class="mini-badge">Auth</span>
                        </div>
                        <div class="table-wrap scrollable-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>IP</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="event in failedLoginsForSelected" :key="event.id">
                                        <td>{{ event.user }}</td>
                                        <td>{{ event.sourceIp }}</td>
                                        <td>{{ formatDateTime(event.timestamp) }}</td>
                                    </tr>
                                    <tr v-if="!failedLoginsForSelected.length">
                                        <td colspan="3" class="text-muted text-center">Sin intentos de autenticación fallidos registrados.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Accesos exitosos</h5>
                            <span class="mini-badge">Successful login</span>
                        </div>
                        <div class="table-wrap scrollable-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>IP origen</th>
                                        <th>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="event in successfulLoginsForSelected" :key="event.id">
                                        <td>{{ event.user }}</td>
                                        <td>{{ event.sourceIp }}</td>
                                        <td>{{ formatDateTime(event.timestamp) }}</td>
                                    </tr>
                                    <tr v-if="!successfulLoginsForSelected.length">
                                        <td colspan="3" class="text-muted text-center">Sin accesos exitosos registrados.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4">
                <div class="card-head">
                    <h5>Sudo y cambios críticos</h5>
                    <span class="mini-badge">Privileged</span>
                </div>
                <div class="table-wrap scrollable-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Usuario</th>
                                <th>Detalle</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="event in selectedPrivilegedEvents" :key="event.id">
                                <td><span class="mini-badge" style="font-size:0.7rem">{{ humanizeEventKind(event.kind) }}</span></td>
                                <td>{{ event.user || '—' }}</td>
                                <td style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" :title="event.message || event.file || event.subject">{{ event.message || event.file || event.subject }}</td>
                                <td>{{ formatDateTime(event.timestamp) }}</td>
                            </tr>
                            <tr v-if="!selectedPrivilegedEvents.length">
                                <td colspan="4" class="text-muted text-center">Sin eventos privilegiados registrados.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tool-card">
                <div class="card-head">
                    <h5>Timeline de eventos de seguridad</h5>
                    <span class="mini-badge">{{ timelineSecurityEvents.length }} eventos</span>
                </div>
                <div class="timeline-list scrollable-wrap">
                    <article v-for="event in timelineSecurityEvents" :key="event.id" class="timeline-entry">
                        <div class="timeline-dot" :class="timelineDotClass(event.kind)"></div>
                        <div class="timeline-body">
                            <strong>{{ humanizeEventKind(event.kind) }}</strong>
                            <p>{{ event.message || event.file || event.subject || "Evento detectado" }}</p>
                            <small>{{ formatDateTime(event.timestamp) }} · {{ event.user || event.sourceIp || "sin origen" }}</small>
                        </div>
                    </article>
                    <div v-if="!timelineSecurityEvents.length" class="empty-box compact-empty">Sin eventos de seguridad para este sistema.</div>
                </div>
            </div>
        </section>

        <section v-else-if="selectedAgent && detailTab === 'logs'" class="section-box">
            <div class="control-grid compact-grid">
                <div class="control-field">
                    <label class="field-label" for="log-level">Nivel</label>
                    <select id="log-level" v-model="logFilters.level" class="form-select input-dark">
                        <option value="all">Todos</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="ERROR">ERROR</option>
                        <option value="CRITICAL">CRITICAL</option>
                    </select>
                </div>
                <div class="control-field">
                    <label class="field-label" for="log-source">Fuente</label>
                    <select id="log-source" v-model="logFilters.source" class="form-select input-dark">
                        <option v-for="source in logSourceOptions" :key="source.value" :value="source.value">{{ source.label }}</option>
                    </select>
                </div>
                <div class="control-field full-span">
                    <label class="field-label" for="log-search">Filtro de texto libre</label>
                    <input id="log-search" v-model="logFilters.text" class="form-control input-dark" placeholder="ssh, sudo, error, nginx..." />
                </div>
            </div>

            <div class="inline-actions">
                <button class="btn btn-subtle" @click="exportSelectedLogs('json')">Exportar JSON</button>
                <button class="btn btn-subtle" @click="exportSelectedLogs('csv')">Exportar CSV</button>
            </div>

            <div class="output-box tall-output">
                <pre class="result-pre">{{ formattedFilteredLogs }}</pre>
            </div>
        </section>

        <section v-else-if="selectedAgent && detailTab === 'alerts'" class="section-box">
            <div class="table-wrap scrollable-wrap">
                <table class="table table-dark align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Descripcion</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="alert in selectedAlerts" :key="alert.id">
                            <td>{{ alert.typeLabel }}</td>
                            <td>{{ alert.description }}</td>
                            <td>{{ formatDateTime(alert.createdAt) }}</td>
                            <td><span class="state-chip" :class="alertStatusClass(alert.status)">{{ alert.status }}</span></td>
                            <td>
                                <div class="table-actions">
                                    <button class="btn btn-quiet" @click="setAlertStatus(alert.id, 'reviewed')">Revisada</button>
                                    <button class="btn btn-quiet" @click="setAlertStatus(alert.id, 'resolved')">Resuelta</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section v-else-if="selectedAgent" class="section-box">
            <div class="tool-card mb-4">
                <div class="card-head">
                    <h5>Histórico de métricas</h5>
                    <span class="mini-badge">{{ historyRangeDays }}d</span>
                </div>
                <div v-if="uniqueDiskMountpoints.length > 1" class="disk-toggles">
                    <span class="disk-toggle-label">Disco:</span>
                    <button
                        v-for="mp in uniqueDiskMountpoints"
                        :key="mp"
                        class="disk-toggle-btn"
                        :class="{ 'disk-toggle-active': diskToggles[mp] !== false }"
                        :style="{ '--tcol': diskColorMap[mp]?.border }"
                        @click="toggleDiskMountpoint(mp)"
                    >{{ mp }}</button>
                </div>
                <ThorondorLineChart chart-id="thorondor-history-only-chart" :labels="selectedHistoryChart.labels" :datasets="selectedHistoryChart.datasets" title="Histórico del sistema" />
            </div>

            <div class="table-wrap scrollable-wrap">
                <table class="table table-dark table-sm align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>CPU</th>
                            <th>RAM</th>
                            <th>Disco</th>
                            <th>Usuarios conectados</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="snapshot in historicalSnapshots" :key="snapshot.id">
                            <td>{{ formatDateTime(snapshot.timestamp) }}</td>
                            <td>{{ formatPercent(snapshot.cpuTotal) }}</td>
                            <td>{{ formatPercent(snapshot.memoryPercent) }}</td>
                            <td>{{ formatPercent(snapshot.diskPercent) }}</td>
                            <td>{{ snapshot.connectedUsers?.length || 0 }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section v-else class="section-box">
            <div class="empty-box">No hay hosts seleccionados. Registra uno desde el generador o elige un agente en dashboard.</div>
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorLineChart from "@/components/Thorondor/ThorondorLineChart.vue";
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";
import { THORONDOR_LOG_SOURCES } from "@/features/thorondor/data/thorondorDefaults";
import { deriveThorondorAgentStatus } from "@/features/thorondor/services/thorondorRules";
import { toCsv } from "@/features/thorondor/utils/formatters";

export default {
    name: "ThorondorDetalleHostsView",

    components: {
        ThorondorLineChart,
        ThorondorPageShell
    },

    mixins: [thorondorBaseMixin],

    data() {
        return {
            detailTab: "overview",
            historyRangeDays: 7,
            diskToggles: {},
            logFilters: {
                level: "all",
                text: "",
                source: "all"
            }
        };
    },

    computed: {
        logSourceOptions() {
            return THORONDOR_LOG_SOURCES;
        },

        detailTabs() {
            return [
                { id: "overview", label: "Vision general" },
                { id: "security", label: "Seguridad" },
                { id: "network", label: "Red" },
                { id: "infra", label: "Infraestructura" },
                { id: "logs", label: "Logs" },
                { id: "alerts", label: "Alertas" },
                { id: "history", label: "Histórico" }
            ];
        },

        selectedOverviewCards() {
            if (!this.selectedAgent || !this.selectedLatestSnapshot) return [];
            const status = deriveThorondorAgentStatus(this.selectedAgent);
            const failedSvcs = this.snapshotFailedServices.length;
            const dnsOk = this.snapshotDns.length ? this.snapshotDns.every((d) => d.ok) : null;
            const updateCount = this.snapshotPendingUpdates.count;

            const cards = [
                { label: "Hostname", value: this.selectedLatestSnapshot.hostname, tone: "tone-neutral", note: this.selectedLatestSnapshot.localIp },
                { label: "Endpoint", value: this.agentEndpoint(this.selectedAgent), tone: "tone-blue", note: this.networkScopeLabel(this.selectedAgent) },
                { label: "Estado", value: status.label, tone: status.color === "success" ? "tone-success" : (status.color === "warning" ? "tone-warning" : "tone-danger"), note: status.note },
                { label: "Kernel", value: this.selectedLatestSnapshot.kernel, tone: "tone-blue", note: this.selectedAgent.distro },
                { label: "Uptime", value: this.formatDurationSeconds(this.selectedLatestSnapshot.uptimeSeconds), tone: "tone-neutral", note: `${this.selectedLatestSnapshot.connectedUsers?.length || 0} usuarios conectados` },
                { label: "CPU", value: this.formatPercent(this.selectedLatestSnapshot.cpuTotal), tone: "tone-warning", note: `${this.selectedLatestSnapshot.cpuPerCore?.length || 0} núcleos visibles` },
                { label: "RAM", value: this.formatPercent(this.selectedLatestSnapshot.memoryPercent), tone: "tone-success", note: `${this.formatBytes(this.selectedLatestSnapshot.memoryUsed)} / ${this.formatBytes(this.selectedLatestSnapshot.memoryTotal)}` },
                { label: "Swap", value: this.formatPercent(this.selectedLatestSnapshot.swapPercent), tone: "tone-neutral", note: "Intercambio actual" },
                { label: "Disco", value: this.formatPercent(this.selectedLatestSnapshot.diskPercent), tone: "tone-warning", note: `${this.selectedLatestSnapshot.disks?.length || 0} particiones` }
            ];

            if (failedSvcs > 0) {
                cards.push({ label: "Servicios FAILED", value: `${failedSvcs}`, tone: "tone-danger", note: this.snapshotFailedServices.slice(0, 2).map((s) => s.name).join(", ") });
            }
            if (dnsOk !== null) {
                cards.push({ label: "Conectividad DNS", value: dnsOk ? "OK" : "FALLO", tone: dnsOk ? "tone-success" : "tone-danger", note: `${this.snapshotDns.filter((d) => d.ok).length}/${this.snapshotDns.length} objetivos resueltos` });
            }
            if (updateCount > 0) {
                cards.push({ label: "Actualizaciones", value: `${updateCount}`, tone: updateCount > 20 ? "tone-danger" : "tone-warning", note: "Paquetes pendientes de aplicar" });
            }

            return cards;
        },

        historicalSnapshots() {
            const cutoff = Date.now() - (this.historyRangeDays * 86400000);
            return this.selectedAgentSnapshots.filter((snapshot) => new Date(snapshot.timestamp).getTime() >= cutoff);
        },

        uniqueDiskMountpoints() {
            const seen = new Set();
            this.historicalSnapshots.forEach((snapshot) => {
                (snapshot.disks || []).forEach((d) => seen.add(d.mountpoint));
            });
            return [...seen].sort();
        },

        diskColorMap() {
            const palette = [
                { border: "rgba(251, 191, 36, 1)", bg: "rgba(251, 191, 36, 0.15)" },
                { border: "rgba(249, 115, 22, 1)", bg: "rgba(249, 115, 22, 0.15)" },
                { border: "rgba(239, 68, 68, 1)", bg: "rgba(239, 68, 68, 0.15)" },
                { border: "rgba(168, 85, 247, 1)", bg: "rgba(168, 85, 247, 0.15)" },
                { border: "rgba(236, 72, 153, 1)", bg: "rgba(236, 72, 153, 0.15)" },
                { border: "rgba(174, 184, 196, 1)", bg: "rgba(174, 184, 196, 0.15)" }
            ];
            return this.uniqueDiskMountpoints.reduce((acc, mp, i) => {
                acc[mp] = palette[i % palette.length];
                return acc;
            }, {});
        },

        diskDatasets() {
            const snapshots = this.historicalSnapshots;
            return this.uniqueDiskMountpoints
                .filter((mp) => this.diskToggles[mp] !== false)
                .map((mp) => {
                    const color = this.diskColorMap[mp] || { border: "rgba(251, 191, 36, 1)", bg: "rgba(251, 191, 36, 0.15)" };
                    return {
                        label: `Disco ${mp}`,
                        data: snapshots.map((snapshot) => {
                            const d = (snapshot.disks || []).find((disk) => disk.mountpoint === mp);
                            return d != null ? d.percent : null;
                        }),
                        borderColor: color.border,
                        backgroundColor: color.bg,
                        tension: 0.25,
                        spanGaps: true
                    };
                });
        },

        selectedHistoryChart() {
            const snapshots = this.historicalSnapshots;
            return {
                labels: snapshots.map((snapshot) => this.formatDateTime(snapshot.timestamp)),
                datasets: [
                    { label: "CPU", data: snapshots.map((snapshot) => snapshot.cpuTotal), borderColor: "rgba(176, 184, 194, 1)", backgroundColor: "rgba(176, 184, 194, 0.18)", tension: 0.25, spanGaps: true },
                    { label: "RAM", data: snapshots.map((snapshot) => snapshot.memoryPercent), borderColor: "rgba(74, 222, 128, 1)", backgroundColor: "rgba(74, 222, 128, 0.18)", tension: 0.25, spanGaps: true },
                    ...this.diskDatasets
                ]
            };
        },

        topProcesses() {
            return (this.selectedLatestSnapshot?.processes || []).slice(0, 10);
        },

        failedLoginsForSelected() {
            return this.selectedSecurityEvents.filter((event) => event.kind === "failed_login");
        },

        successfulLoginsForSelected() {
            return this.selectedSecurityEvents.filter((event) => event.kind === "successful_login");
        },

        selectedPrivilegedEvents() {
            const seen = new Set();
            return this.selectedSecurityEvents
                .filter((event) => ["sudo_command", "critical_file_change", "new_user"].includes(event.kind))
                .filter((event) => {
                    const key = `${event.kind}|${event.user}|${event.message || event.file || event.subject}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        },

        timelineSecurityEvents() {
            const excluded = new Set(["failed_login", "successful_login", "sudo_command", "critical_file_change", "new_user"]);
            return this.selectedSecurityEvents.filter((event) => !excluded.has(event.kind));
        },

        filteredLogs() {
            return this.selectedAgentLogs.filter((entry) => {
                const levelMatch = this.logFilters.level === "all" || entry.level === this.logFilters.level;
                const sourceMatch = this.logFilters.source === "all" || entry.source === this.logFilters.source;
                const textMatch = !this.logFilters.text || entry.message.toLowerCase().includes(this.logFilters.text.toLowerCase());
                return levelMatch && sourceMatch && textMatch;
            });
        },

        formattedFilteredLogs() {
            if (!this.filteredLogs.length) return "Sin logs para el filtro actual.";
            return this.filteredLogs.slice().reverse().map((entry) => `[${entry.timestamp}] [${entry.level}] [${entry.source}] ${entry.message}`).join("\n");
        },

        snapshotHardware() {
            return this.selectedLatestSnapshot?.hardware || null;
        },

        snapshotGpu() {
            return this.selectedLatestSnapshot?.gpu || [];
        },

        snapshotFans() {
            return this.selectedLatestSnapshot?.fans || [];
        },

        snapshotBattery() {
            return this.selectedLatestSnapshot?.battery || null;
        },

        snapshotNetworkRates() {
            return this.selectedLatestSnapshot?.networkRates || [];
        },

        snapshotEstablished() {
            return this.selectedLatestSnapshot?.establishedConnections || [];
        },

        snapshotFailedServices() {
            return this.selectedLatestSnapshot?.failedServices || [];
        },

        snapshotDocker() {
            return this.selectedLatestSnapshot?.docker || [];
        },

        snapshotPendingUpdates() {
            return this.selectedLatestSnapshot?.pendingUpdates || { count: 0, updates: [] };
        },

        snapshotDns() {
            return this.selectedLatestSnapshot?.dns || [];
        },

        snapshotSmartData() {
            return this.selectedLatestSnapshot?.smartData || [];
        },

        snapshotLoginHistory() {
            return this.selectedLatestSnapshot?.loginHistory || [];
        },

        batteryTimeLabel() {
            const bat = this.snapshotBattery;
            if (!bat) return "";
            if (bat.secsLeft < 0) return bat.powerPlugged ? "Cargando / AC" : "Tiempo desconocido";
            const h = Math.floor(bat.secsLeft / 3600);
            const m = Math.floor((bat.secsLeft % 3600) / 60);
            return `${h}h ${m}m restantes`;
        }
    },

    mounted() {
        this.syncSelectedAgentFromRoute();
    },

    watch: {
        "$route.query.agent": {
            immediate: true,
            handler() {
                this.syncSelectedAgentFromRoute();
            }
        }
    },

    methods: {
        syncSelectedAgentFromRoute() {
            const routeAgent = this.$route.query.agent;
            if (routeAgent && this.dashboardCards.find((item) => item.id === routeAgent)) {
                this.selectAgent(routeAgent);
                return;
            }

            this.ensureSelectedAgent();
        },

        selectAgentAndSync(agentId) {
            this.selectAgent(agentId);
            this.$router.replace({
                name: "thorondor-host-detail",
                query: { agent: agentId }
            });
        },

        exportSelectedLogs(kind) {
            const rows = this.filteredLogs;
            const fileName = `${this.selectedAgent?.systemName || "thorondor-logs"}-${Date.now()}.${kind}`;
            if (kind === "json") {
                this.downloadTextFile(fileName, JSON.stringify(rows, null, 2));
                return;
            }
            this.downloadTextFile(fileName, toCsv(rows));
        },

        downloadTextFile(filename, content) {
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
        },

        async setAlertStatus(id, status) {
            await this.$store.dispatch("setThorondorAlertStatus", { id, status });
        },

        toggleDiskMountpoint(mp) {
            this.diskToggles = {
                ...this.diskToggles,
                [mp]: this.diskToggles[mp] === false ? true : false
            };
        },

        diskBarColor(percent) {
            if (percent >= 90) return "rgba(239, 68, 68, 0.85)";
            if (percent >= 75) return "rgba(251, 191, 36, 0.85)";
            return "rgba(74, 222, 128, 0.85)";
        },

        tempColorClass(celsius) {
            if (celsius == null) return "tone-neutral";
            if (celsius >= 90) return "tone-danger";
            if (celsius >= 75) return "tone-warning";
            return "tone-success";
        },

        tempBarColor(celsius) {
            if (celsius >= 90) return "rgba(239, 68, 68, 0.85)";
            if (celsius >= 75) return "rgba(251, 191, 36, 0.85)";
            return "rgba(74, 222, 128, 0.85)";
        },

        timelineDotClass(kind) {
            if (kind === "error") return "danger-dot";
            return "";
        }
    }
};
</script>

<style scoped>
.small-code {
    font-size: 0.78rem;
    color: #9aa6b3;
    background: var(--thorondor-soft-background);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
}

.disk-bar-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.disk-bar-track {
    flex: 1;
    height: 5px;
    background: var(--thorondor-soft-background);
    border-radius: 4px;
    overflow: hidden;
    min-width: 60px;
}

.disk-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.35s ease;
}

.disk-bar-pct {
    font-size: 0.78rem;
    color: #9aa6b3;
    min-width: 40px;
    text-align: right;
}

.disk-toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid rgba(176, 184, 194, 0.16);
}

.disk-toggle-label {
    font-size: 0.72rem;
    color: #8d98a4;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-right: 0.15rem;
}

.disk-toggle-btn {
    font-size: 0.74rem;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    padding: 0.18rem 0.55rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    color: #7d8792;
    cursor: var(--cursor-pointer), pointer;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.disk-toggle-btn.disk-toggle-active {
    border-color: var(--tcol, rgba(176, 184, 194, 0.58));
    color: var(--tcol, rgba(207, 214, 222, 1));
    background: var(--thorondor-soft-background);
}

.disk-toggle-btn:hover {
    border-color: rgba(255, 255, 255, 0.22);
    color: #9aa6b3;
}

.temp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 0.7rem;
}

.temp-card {
    background: var(--thorondor-nested-background);
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    padding: 0.7rem 0.85rem;
    display: grid;
    gap: 0.45rem;
    align-content: start;
}

.temp-card-source {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
}

.temp-label-badge {
    font-size: 0.68rem;
    padding: 2px 7px;
}

.temp-reading {
    font-size: 1.42rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
}

.kv-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin: 0;
}

.kv-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid rgba(176, 184, 194, 0.14);
    font-size: 0.83rem;
}

.kv-row:last-child {
    border-bottom: none;
}

.kv-row dt {
    color: #8d98a4;
    font-weight: 500;
    flex-shrink: 0;
}

.kv-row dd {
    color: #cfd6de;
    text-align: right;
    margin: 0;
    font-variant-numeric: tabular-nums;
}

.gpu-card {
    padding: 0.6rem 0;
    border-bottom: 1px solid rgba(176, 184, 194, 0.15);
}

.gpu-card:last-child {
    border-bottom: none;
}

.badge-ok {
    background: rgba(34, 197, 94, 0.18);
    color: #4ade80;
    border-color: rgba(34, 197, 94, 0.3);
}

.badge-warn {
    background: rgba(234, 179, 8, 0.18);
    color: #facc15;
    border-color: rgba(234, 179, 8, 0.3);
}

.badge-danger {
    background: rgba(239, 68, 68, 0.18);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
}

.state-chip--ok {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.25);
}

.state-chip--danger {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
}
</style>
