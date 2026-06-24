<template>
    <ThorondorPageShell>
        <section class="section-box intro-box">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Análisis por host</span>
                    <h1 class="section-name">Detalle por host</h1>
                    <p class="section-copy">
                        Métricas, procesos, seguridad, logs, alertas e histórico del sistema seleccionado.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Host</span>
                    <small>{{ selectedAgent ? selectedAgent.displayName : "Sin sistema seleccionado" }}</small>
                </div>
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
                            <div class="kv-row"><dt>Núcleos físicos</dt><dd>{{ snapshotHardware.cpuCoresPhysical }}</dd></div>
                            <div class="kv-row"><dt>Núcleos lógicos</dt><dd>{{ snapshotHardware.cpuCoresLogical }}</dd></div>
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
                                <div class="kv-row" v-if="gpu.utilPercent != null"><dt>Utilización</dt><dd>{{ gpu.utilPercent }}%</dd></div>
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
                    <h5>Evolución temporal del sistema seleccionado</h5>
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
                            <h5>Interfaces de red y tráfico</h5>
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
        <section v-else-if="selectedAgent && detailTab === 'hardware'" class="section-box">
            <div class="hardware-usage-grid mb-4">
                <article v-for="card in hardwareUsageCards" :key="card.label" class="hardware-usage-card">
                    <div>
                        <label>{{ card.label }}</label>
                        <strong :class="card.tone">{{ card.value }}</strong>
                        <small>{{ card.note }}</small>
                    </div>
                    <div class="hardware-meter">
                        <div class="hardware-meter-fill" :class="card.tone" :style="{ width: card.width }"></div>
                    </div>
                </article>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-5">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Inventario del equipo</h5>
                            <span class="mini-badge">{{ snapshotHardware?.osCaption || selectedAgent.distro || 'Host' }}</span>
                        </div>
                        <dl class="kv-list" v-if="snapshotHardware">
                            <div v-for="row in hardwareIdentityRows" :key="row.label" class="kv-row">
                                <dt>{{ row.label }}</dt>
                                <dd>{{ row.value }}</dd>
                            </div>
                        </dl>
                        <div v-else class="empty-box compact-empty">Sin inventario hardware en la última telemetría.</div>
                    </div>
                </div>
                <div class="col-xl-7">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>CPU y núcleos</h5>
                            <span class="mini-badge">{{ cpuCoreReadings.length }} núcleos lógicos</span>
                        </div>
                        <div class="cpu-core-grid" v-if="cpuCoreReadings.length">
                            <div v-for="core in cpuCoreReadings" :key="core.label" class="cpu-core-row">
                                <span>{{ core.label }}</span>
                                <div class="hardware-meter">
                                    <div class="hardware-meter-fill" :class="usageTone(core.value)" :style="{ width: barWidth(core.value) }"></div>
                                </div>
                                <strong>{{ formatPercent(core.value) }}</strong>
                            </div>
                        </div>
                        <div v-else class="empty-box compact-empty">Sin lectura por núcleo en el último polling.</div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Memoria RAM</h5>
                            <span class="mini-badge">{{ formatBytes(selectedLatestSnapshot?.memoryUsed) }} usados</span>
                        </div>
                        <div class="hardware-main-reading">
                            <strong>{{ formatPercent(selectedLatestSnapshot?.memoryPercent) }}</strong>
                            <span>{{ formatBytes(selectedLatestSnapshot?.memoryAvailable) }} disponibles de {{ formatBytes(selectedLatestSnapshot?.memoryTotal) }}</span>
                        </div>
                        <div class="hardware-meter mb-3">
                            <div class="hardware-meter-fill" :class="usageTone(selectedLatestSnapshot?.memoryPercent)" :style="{ width: barWidth(selectedLatestSnapshot?.memoryPercent) }"></div>
                        </div>
                        <div class="table-wrap compact-table" v-if="memoryModuleRows.length">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr><th>Slot</th><th>Capacidad</th><th>Velocidad</th><th>Fabricante</th></tr>
                                </thead>
                                <tbody>
                                    <tr v-for="module in memoryModuleRows" :key="`${module.locator}-${module.serialNumber}`">
                                        <td><code class="small-code">{{ module.locator || module.bank || '-' }}</code></td>
                                        <td>{{ module.capacityBytes ? formatBytes(module.capacityBytes) : module.capacityLabel || 'N/D' }}</td>
                                        <td>{{ module.speedMhz ? module.speedMhz + ' MHz' : 'N/D' }}</td>
                                        <td>{{ module.manufacturer || 'N/D' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="empty-box compact-empty">El agente no ha podido leer módulos físicos de RAM.</div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>GPU</h5>
                            <span class="mini-badge">{{ snapshotGpu.length }} adaptador{{ snapshotGpu.length !== 1 ? 'es' : '' }}</span>
                        </div>
                        <div class="hardware-stack" v-if="snapshotGpu.length">
                            <article v-for="gpu in snapshotGpu" :key="gpu.uuid || gpu.name" class="hardware-row hardware-row--rich">
                                <div class="hardware-row-title">
                                    <strong>{{ gpu.name || 'GPU detectada' }}</strong>
                                    <span class="mini-badge">{{ gpu.provider || 'GPU' }}</span>
                                </div>
                                <div class="hardware-row-metrics">
                                    <span>Uso: {{ formatGpuUsage(gpu) }}</span>
                                    <span>VRAM: {{ formatGpuMemory(gpu) }}</span>
                                    <span>Temp: {{ formatGpuTemperature(gpu) }}</span>
                                </div>
                                <small>{{ gpu.driver || gpu.adapterCompatibility || gpu.videoProcessor || 'Sin driver reportado' }}</small>
                            </article>
                        </div>
                        <div v-else class="empty-box compact-empty">Sin GPU reportada. En algunos equipos el fabricante no expone uso o temperatura sin driver específico.</div>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4">
                <div class="card-head">
                    <h5>Discos y almacenamiento</h5>
                    <span class="mini-badge">{{ formatBytes(diskCapacity.free) }} libres</span>
                </div>
                <div class="hardware-main-reading">
                    <strong>{{ formatPercent(diskCapacity.percent) }}</strong>
                    <span>{{ formatBytes(diskCapacity.used) }} ocupados de {{ formatBytes(diskCapacity.total) }}</span>
                </div>
                <div class="hardware-meter mb-3">
                    <div class="hardware-meter-fill" :class="usageTone(diskCapacity.percent)" :style="{ width: barWidth(diskCapacity.percent) }"></div>
                </div>
                <div class="table-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Dispositivo</th>
                                <th>Montaje</th>
                                <th>Tipo</th>
                                <th>Ocupado</th>
                                <th>Libre</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="disk in selectedLatestSnapshot?.disks || []" :key="disk.mountpoint">
                                <td><code class="small-code">{{ disk.device }}</code></td>
                                <td><code class="small-code">{{ disk.mountpoint }}</code></td>
                                <td><span class="mini-badge">{{ disk.fstype }}</span></td>
                                <td>
                                    <div class="disk-bar-row">
                                        <div class="disk-bar-track">
                                            <div class="disk-bar-fill" :style="{ width: barWidth(disk.percent), background: diskBarColor(disk.percent) }"></div>
                                        </div>
                                        <span class="disk-bar-pct">{{ formatPercent(disk.percent) }}</span>
                                    </div>
                                    <small class="table-subtext">{{ formatBytes(disk.used) }}</small>
                                </td>
                                <td>{{ formatBytes(disk.free) }} <small class="table-subtext">{{ formatPercent(disk.freePercent) }}</small></td>
                                <td>{{ formatBytes(disk.total) }}</td>
                            </tr>
                            <tr v-if="!(selectedLatestSnapshot?.disks || []).length">
                                <td colspan="6" class="text-muted text-center">Sin particiones reportadas.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="hardware-physical-list" v-if="physicalDiskRows.length">
                    <article v-for="disk in physicalDiskRows" :key="disk.device || disk.name || disk.model" class="hardware-physical-row">
                        <strong>{{ disk.model || disk.name || disk.device || 'Disco físico' }}</strong>
                        <span>{{ formatBytes(disk.sizeBytes) }} · {{ disk.mediaType || disk.interfaceType || 'Tipo N/D' }}</span>
                        <small>{{ disk.serialNumber || disk.healthStatus || disk.vendor || 'Sin detalle físico adicional' }}</small>
                    </article>
                </div>
            </div>

            <div class="row g-3">
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Temperaturas y ventilación</h5>
                            <span class="mini-badge">{{ selectedLatestSnapshot?.temperatures?.length || 0 }} sensores</span>
                        </div>
                        <div class="temp-grid" v-if="(selectedLatestSnapshot?.temperatures || []).length">
                            <div v-for="sensor in selectedLatestSnapshot?.temperatures || []" :key="`${sensor.source}-${sensor.label}`" class="temp-card">
                                <div class="temp-card-source">
                                    <code class="small-code">{{ sensor.source }}</code>
                                    <span v-if="sensor.label && sensor.label !== sensor.source" class="mini-badge temp-label-badge">{{ sensor.label }}</span>
                                </div>
                                <div class="temp-reading" :class="tempColorClass(sensor.current)">
                                    {{ sensor.current != null ? sensor.current.toFixed(1) + '°C' : 'N/D' }}
                                </div>
                                <div class="hardware-meter">
                                    <div class="hardware-meter-fill" :class="tempColorClass(sensor.current)" :style="{ width: temperatureWidth(sensor.current) }"></div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-box compact-empty">Sin sensores térmicos disponibles en este host.</div>
                        <div class="hardware-stack mt-3" v-if="snapshotFans.length || snapshotBattery">
                            <article v-if="snapshotBattery" class="hardware-row">
                                <strong>Batería / UPS</strong>
                                <span>{{ snapshotBattery.percent }}% · {{ snapshotBattery.powerPlugged ? 'AC conectado' : 'Batería' }}</span>
                                <small>{{ batteryTimeLabel }}</small>
                            </article>
                            <article v-for="fan in snapshotFans" :key="`${fan.source}-${fan.label}`" class="hardware-row">
                                <strong>{{ fan.label || fan.source }}</strong>
                                <span>{{ fan.rpm }} RPM</span>
                                <small>{{ fan.source }}</small>
                            </article>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Estado SMART</h5>
                            <span class="mini-badge">{{ snapshotSmartData.length }} disco{{ snapshotSmartData.length !== 1 ? 's' : '' }}</span>
                        </div>
                        <div v-if="snapshotSmartData.length" class="hardware-stack">
                            <article v-for="disk in snapshotSmartData" :key="disk.device" class="hardware-row">
                                <strong>{{ disk.device }}</strong>
                                <span v-if="Object.keys(disk.attributes || {}).length">{{ Object.keys(disk.attributes).length }} atributos leídos</span>
                                <span v-else>Sin atributos SMART disponibles</span>
                                <small v-for="(val, attr) in disk.attributes" :key="attr" :class="(attr.includes('Error') || attr.includes('Sector')) && val > 0 ? 'tone-danger' : 'tone-neutral'">
                                    {{ attr.replace(/_/g, ' ') }}: {{ val }}
                                </small>
                            </article>
                        </div>
                        <div v-else class="empty-box compact-empty">SMART no disponible o sin permisos en este host.</div>
                    </div>
                </div>
            </div>
        </section>

        <section v-else-if="selectedAgent && detailTab === 'hardwareLegacy'" class="section-box">
            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Inventario hardware</h5>
                            <span class="mini-badge">CPU / RAM</span>
                        </div>
                        <dl class="kv-list" v-if="snapshotHardware">
                            <div class="kv-row"><dt>Modelo CPU</dt><dd>{{ snapshotHardware.cpuModel || 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Núcleos físicos</dt><dd>{{ snapshotHardware.cpuCoresPhysical || 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Núcleos lógicos</dt><dd>{{ snapshotHardware.cpuCoresLogical || 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Frecuencia actual</dt><dd>{{ snapshotHardware.cpuFreqMhz ? snapshotHardware.cpuFreqMhz + ' MHz' : 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>RAM total</dt><dd>{{ snapshotHardware.totalRamGb ? snapshotHardware.totalRamGb + ' GB' : formatBytes(selectedLatestSnapshot?.memoryTotal) }}</dd></div>
                        </dl>
                        <div v-else class="empty-box compact-empty">Sin inventario hardware en la última telemetría.</div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>GPU, batería y ventiladores</h5>
                            <span class="mini-badge">{{ snapshotGpu.length + snapshotFans.length }} lecturas</span>
                        </div>
                        <div class="hardware-stack">
                            <article v-for="gpu in snapshotGpu" :key="gpu.name" class="hardware-row">
                                <strong>{{ gpu.name }}</strong>
                                <span>{{ gpu.vramMb ? gpu.vramMb + ' MB VRAM' : gpu.vramBytes ? formatBytes(gpu.vramBytes) + ' VRAM' : 'VRAM N/D' }}</span>
                                <small>{{ gpu.tempC ? gpu.tempC + '°C' : 'Temperatura N/D' }} · {{ gpu.driver || 'Driver N/D' }}</small>
                            </article>
                            <article v-if="snapshotBattery" class="hardware-row">
                                <strong>Batería / UPS</strong>
                                <span>{{ snapshotBattery.percent }}% · {{ snapshotBattery.powerPlugged ? 'AC conectado' : 'Batería' }}</span>
                                <small>{{ batteryTimeLabel }}</small>
                            </article>
                            <article v-for="fan in snapshotFans" :key="`${fan.source}-${fan.label}`" class="hardware-row">
                                <strong>{{ fan.label || fan.source }}</strong>
                                <span>{{ fan.rpm }} RPM</span>
                                <small>{{ fan.source }}</small>
                            </article>
                            <div v-if="!snapshotGpu.length && !snapshotFans.length && !snapshotBattery" class="empty-box compact-empty">Sin sensores de GPU, batería o ventiladores.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-7">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Discos y particiones</h5>
                            <span class="mini-badge">{{ selectedLatestSnapshot?.disks?.length || 0 }} particiones</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Dispositivo</th>
                                        <th>Montaje</th>
                                        <th>Tipo</th>
                                        <th>Uso</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="disk in selectedLatestSnapshot?.disks || []" :key="disk.mountpoint">
                                        <td><code class="small-code">{{ disk.device }}</code></td>
                                        <td><code class="small-code">{{ disk.mountpoint }}</code></td>
                                        <td><span class="mini-badge">{{ disk.fstype }}</span></td>
                                        <td>{{ (disk.percent || 0).toFixed(1) }}%</td>
                                        <td>{{ formatBytes(disk.total) }}</td>
                                    </tr>
                                    <tr v-if="!(selectedLatestSnapshot?.disks || []).length">
                                        <td colspan="5" class="text-muted text-center">Sin particiones reportadas.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-5">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Sensores térmicos</h5>
                            <span class="mini-badge">{{ selectedLatestSnapshot?.temperatures?.length || 0 }} sensores</span>
                        </div>
                        <div class="temp-grid">
                            <div v-for="sensor in selectedLatestSnapshot?.temperatures || []" :key="`${sensor.source}-${sensor.label}`" class="temp-card">
                                <div class="temp-card-source">
                                    <code class="small-code">{{ sensor.source }}</code>
                                    <span v-if="sensor.label && sensor.label !== sensor.source" class="mini-badge temp-label-badge">{{ sensor.label }}</span>
                                </div>
                                <div class="temp-reading" :class="tempColorClass(sensor.current)">
                                    {{ sensor.current != null ? sensor.current.toFixed(1) + '°C' : 'N/D' }}
                                </div>
                            </div>
                            <div v-if="!(selectedLatestSnapshot?.temperatures || []).length" class="empty-box compact-empty">Sin sensores térmicos disponibles.</div>
                        </div>
                    </div>
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

        <section v-else-if="selectedAgent && detailTab === 'processes'" class="section-box">
            <div class="section-topline mb-3">
                <div class="module-header">
                    <span class="section-kicker">Procesos</span>
                    <h2 class="section-name">Procesos del host</h2>
                    <p class="section-copy">
                        Inventario de procesos vivos, consumo de CPU/RAM, usuario propietario, estado y comando de arranque.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Polling</span>
                    <small>{{ selectedLatestSnapshot ? formatDateTime(selectedLatestSnapshot.timestamp) : "Sin telemetría" }}</small>
                </div>
            </div>

            <div class="process-summary-grid mb-4">
                <article v-for="card in processSummaryCards" :key="card.label" class="process-summary-card">
                    <label>{{ card.label }}</label>
                    <strong>{{ card.value }}</strong>
                    <small>{{ card.note }}</small>
                </article>
            </div>

            <div class="tool-card">
                <div class="card-head">
                    <h5>Procesos en ejecución</h5>
                    <span class="mini-badge">{{ filteredProcessRows.length }} visibles</span>
                </div>

                <div class="process-toolbar">
                    <div class="control-field">
                        <label class="field-label" for="process-search">Buscar</label>
                        <input id="process-search" v-model="processFilters.text" class="form-control input-dark" type="search" placeholder="Nombre, PID, usuario, comando..." />
                    </div>
                    <div class="control-field">
                        <label class="field-label" for="process-sort">Orden</label>
                        <select id="process-sort" v-model="processFilters.sort" class="form-select input-dark">
                            <option value="cpu">Mayor CPU</option>
                            <option value="memory">Mayor memoria</option>
                            <option value="ports">Actividad de red</option>
                            <option value="name">Nombre</option>
                            <option value="pid">PID</option>
                        </select>
                    </div>
                </div>

                <div class="table-wrap scrollable-wrap process-table-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Proceso</th>
                                <th>PID</th>
                                <th>Usuario</th>
                                <th>Estado</th>
                                <th>CPU</th>
                                <th>RAM</th>
                                <th>RSS</th>
                                <th>Hilos</th>
                                <th>Red</th>
                                <th>Inicio</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="process in filteredProcessRows" :key="`${process.pid}-${process.name}`">
                                <td class="process-name-cell">
                                    <strong>{{ process.name }}</strong>
                                    <span v-if="process.cmdline" class="table-subtext">{{ process.cmdline }}</span>
                                    <span v-else-if="process.exe" class="table-subtext">{{ process.exe }}</span>
                                </td>
                                <td><code class="small-code">{{ process.pid || "N/D" }}</code></td>
                                <td>{{ process.user || "N/D" }}</td>
                                <td><span class="state-chip" :class="processStatusClass(process.status)">{{ process.status || "N/D" }}</span></td>
                                <td>
                                    <div class="resource-meter-cell">
                                        <div class="disk-bar-track"><div class="disk-bar-fill" :style="{ width: processCpuWidth(process), background: diskBarColor(process.cpuPercent) }"></div></div>
                                        <span>{{ formatPercent(process.cpuPercent) }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="resource-meter-cell">
                                        <div class="disk-bar-track"><div class="disk-bar-fill" :style="{ width: processMemoryWidth(process), background: diskBarColor(process.memoryPercent) }"></div></div>
                                        <span>{{ formatPercent(process.memoryPercent) }}</span>
                                    </div>
                                </td>
                                <td>{{ process.memoryRss ? formatBytes(process.memoryRss) : "N/D" }}</td>
                                <td>{{ process.threads || "N/D" }}</td>
                                <td>
                                    <span class="mini-badge">{{ process.portCount }} puertos</span>
                                    <span class="mini-badge">{{ process.connectionCount }} conexiones</span>
                                </td>
                                <td>{{ formatProcessStarted(process.createdAt) }}</td>
                            </tr>
                            <tr v-if="!filteredProcessRows.length">
                                <td colspan="10" class="text-muted text-center">Sin procesos para el filtro actual.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section v-else-if="selectedAgent && detailTab === 'network'" class="section-box">
            <div class="section-topline mb-3">
                <div class="module-header">
                    <span class="section-kicker">Red</span>
                    <h2 class="section-name">Puertos y conexiones</h2>
                    <p class="section-copy">
                        Interfaces, tráfico, puertos abiertos y conexiones establecidas del host monitorizado.
                    </p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Socket</span>
                    <small>TCP LISTEN / UDP / ESTABLISHED</small>
                </div>
            </div>

            <div class="process-summary-grid mb-4">
                <article v-for="card in networkSummaryCards" :key="card.label" class="process-summary-card">
                    <label>{{ card.label }}</label>
                    <strong>{{ card.value }}</strong>
                    <small>{{ card.note }}</small>
                </article>
            </div>

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
                                <th>TX (envía)</th>
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
                                <td colspan="3" class="text-muted text-center">Sin datos de velocidad de red. El agente enviará esta métrica cuando el host la tenga disponible.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tool-card mb-4">
                <div class="card-head">
                    <h5>Puertos abiertos</h5>
                    <span class="mini-badge">{{ openPortRows.length }} puertos</span>
                </div>
                <div class="table-wrap scrollable-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Proto</th>
                                <th>Dirección</th>
                                <th>Puerto</th>
                                <th>Proceso</th>
                                <th>PID</th>
                                <th>Usuario</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="port in openPortRows" :key="`${port.proto}-${port.ip}-${port.port}-${port.pid}`">
                                <td><span class="protocol-badge" :class="protocolBadgeClass(port.proto)">{{ port.proto }}</span></td>
                                <td><code class="small-code">{{ port.ip || "0.0.0.0" }}</code></td>
                                <td><code class="small-code">{{ port.port }}</code></td>
                                <td>
                                    {{ port.process || "N/D" }}
                                    <span v-if="port.cmdline" class="table-subtext">{{ port.cmdline }}</span>
                                </td>
                                <td>{{ port.pid || "N/D" }}</td>
                                <td>{{ port.user || "N/D" }}</td>
                                <td><span class="state-chip state-chip--ok">{{ port.status || "OPEN" }}</span></td>
                            </tr>
                            <tr v-if="!openPortRows.length">
                                <td colspan="7" class="text-muted text-center">Sin puertos abiertos detectados o sin permisos para consultarlos.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="tool-card">
                <div class="card-head">
                    <h5>Conexiones TCP establecidas</h5>
                    <span class="mini-badge">{{ connectionRows.length }} ESTABLISHED</span>
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
                                <td colspan="4" class="text-muted text-center">Sin conexiones ESTABLISHED activas o módulo desactivado.</td>
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
                            <h5>Estado operativo del agente</h5>
                            <span class="mini-badge">{{ snapshotAgentStatus.version || selectedAgent.agentVersion || 'N/D' }}</span>
                        </div>
                        <dl class="kv-list">
                            <div class="kv-row"><dt>Endpoint</dt><dd><code class="small-code">{{ snapshotAgentStatus.requestEndpoint || agentEndpoint(selectedAgent) }}</code></dd></div>
                            <div class="kv-row"><dt>Latencia</dt><dd>{{ snapshotAgentStatus.requestLatencyMs ? snapshotAgentStatus.requestLatencyMs + ' ms' : 'Pendiente' }}</dd></div>
                            <div class="kv-row"><dt>Puerto</dt><dd>{{ snapshotAgentStatus.listenPort || selectedAgent.port || 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Key agents</dt><dd>{{ snapshotAgentStatus.keyAgentsPresent ? 'Configurada' : 'No configurada' }}</dd></div>
                            <div class="kv-row"><dt>Comandos</dt><dd>{{ snapshotAgentStatus.commandsAccepted?.length || 0 }} soportados</dd></div>
                            <div class="kv-row"><dt>Errores de recogida</dt><dd :class="snapshotAgentStatus.collectionErrors ? 'tone-warning' : 'tone-success'">{{ snapshotAgentStatus.collectionErrors || 0 }}</dd></div>
                        </dl>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Actualizaciones y reinicio</h5>
                            <span class="mini-badge" :class="snapshotPendingUpdates.count > 20 ? 'badge-danger' : snapshotPendingUpdates.count > 5 ? 'badge-warn' : 'badge-ok'">{{ snapshotPendingUpdates.count }} pendientes</span>
                        </div>
                        <dl class="kv-list">
                            <div class="kv-row"><dt>Gestor</dt><dd>{{ snapshotPendingUpdates.manager || 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Reinicio pendiente</dt><dd :class="snapshotPendingUpdates.rebootRequired ? 'tone-warning' : 'tone-success'">{{ snapshotPendingUpdates.rebootRequired ? 'Sí' : 'No' }}</dd></div>
                            <div class="kv-row"><dt>Último arranque</dt><dd>{{ snapshotPendingUpdates.lastBootTime ? formatDateTime(snapshotPendingUpdates.lastBootTime) : 'N/D' }}</dd></div>
                            <div class="kv-row"><dt>Comprobado</dt><dd>{{ snapshotPendingUpdates.checkedAt ? formatDateTime(snapshotPendingUpdates.checkedAt) : 'N/D' }}</dd></div>
                        </dl>
                        <div v-if="snapshotPendingUpdates.updates?.length" class="output-box compact-scroll">
                            <pre class="result-pre">{{ snapshotPendingUpdates.updates.join('\n') }}</pre>
                        </div>
                        <div v-else class="empty-box compact-empty">Sin actualizaciones pendientes detectadas.</div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-7">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <div>
                                <h5>Baseline del host</h5>
                                <small class="table-subtext">{{ baselineSummaryText }}</small>
                            </div>
                            <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('set-host-baseline', { reason: 'Baseline validado desde Thorondor' })">
                                Marcar como bueno
                            </button>
                        </div>
                        <div class="output-box compact-scroll">
                            <pre class="result-pre">{{ importantBaselineChanges.map(formatInventoryChange).join('\n') || 'Sin cambios importantes pendientes.' }}</pre>
                        </div>
                    </div>
                </div>
                <div class="col-xl-5">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <div>
                                <h5>Modo mantenimiento</h5>
                                <small class="table-subtext">Pausa alertas sin parar la recogida de datos.</small>
                            </div>
                            <span class="mini-badge" :class="alertsPausedActive ? 'badge-warn' : 'badge-ok'">
                                {{ alertsPausedActive ? 'Alertas pausadas' : 'Alertas activas' }}
                            </span>
                        </div>
                        <dl class="kv-list mb-3">
                            <div class="kv-row"><dt>Hasta</dt><dd>{{ maintenanceUntilLabel }}</dd></div>
                            <div class="kv-row"><dt>Motivo</dt><dd>{{ selectedAgent.maintenanceReason || 'N/D' }}</dd></div>
                        </dl>
                        <div class="safe-action-grid maintenance-grid">
                            <div class="control-field">
                                <label class="field-label" for="maintenance-minutes">Minutos</label>
                                <input id="maintenance-minutes" v-model.number="maintenanceDraft.minutes" class="form-control input-dark" type="number" min="15" step="15" placeholder="60" />
                            </div>
                            <div class="control-field">
                                <label class="field-label" for="maintenance-reason">Motivo</label>
                                <input id="maintenance-reason" v-model.trim="maintenanceDraft.reason" class="form-control input-dark" placeholder="Despliegue, pruebas o cambio planificado" />
                            </div>
                        </div>
                        <p v-if="maintenanceFeedback.message" class="management-feedback mt-3" :class="`is-${maintenanceFeedback.type}`">
                            {{ maintenanceFeedback.message }}
                        </p>
                        <div class="table-actions mt-3">
                            <button class="btn btn-quiet" :disabled="maintenanceBusy" @click="setMaintenanceWindow(true)">Pausar alertas</button>
                            <button class="btn btn-quiet" :disabled="maintenanceBusy || !alertsPausedActive" @click="setMaintenanceWindow(false)">Reanudar alertas</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4">
                <div class="card-head">
                    <div>
                        <h5>Inventario de servicios</h5>
                        <small class="table-subtext">{{ serviceManagementGuardMessage }}</small>
                    </div>
                    <button class="btn btn-quiet" :disabled="serviceManagementBusy || !canManageHostServices" @click="queueServiceCommand('refresh-service-inventory')">
                        {{ serviceActionBusy('refresh-service-inventory') ? 'Encolando...' : 'Actualizar servicios' }}
                    </button>
                </div>
                <p v-if="serviceManagementFeedback.message" class="management-feedback" :class="`is-${serviceManagementFeedback.type}`">
                    {{ serviceManagementFeedback.message }}
                </p>
                <div class="table-wrap scrollable-wrap">
                    <table class="table table-dark table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th>Estado</th>
                                <th>Arranque</th>
                                <th>Usuario</th>
                                <th>Último fallo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="svc in visibleServiceInventory" :key="svc.name">
                                <td>
                                    <strong>{{ svc.displayName || svc.name }}</strong>
                                    <code class="small-code">{{ svc.name }}</code>
                                </td>
                                <td><span class="state-chip" :class="serviceStateClass(svc)">{{ svc.activeState || svc.subState || 'N/D' }}</span></td>
                                <td>{{ svc.startup || 'N/D' }}</td>
                                <td>{{ svc.startName || '—' }}</td>
                                <td>
                                    <span v-if="svc.recentFailure">{{ formatDateTime(svc.recentFailure.timestamp) }}</span>
                                    <span v-else>—</span>
                                </td>
                                <td class="action-cell">
                                    <button class="btn btn-quiet" :disabled="!canManageHostServices || serviceManagementBusy || !svc.canManage" @click="queueServiceCommand('start-service', svc)">Arrancar</button>
                                    <button class="btn btn-quiet" :disabled="!canManageHostServices || serviceManagementBusy || !svc.canManage" @click="queueServiceCommand('stop-service', svc)">Parar</button>
                                    <button class="btn btn-quiet" :disabled="!canManageHostServices || serviceManagementBusy || !svc.canManage" @click="queueServiceCommand('restart-service', svc)">Reiniciar</button>
                                </td>
                            </tr>
                            <tr v-if="!visibleServiceInventory.length">
                                <td colspan="6" class="text-muted text-center">Sin inventario de servicios. Actualiza el agente o lanza un nuevo polling.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Tareas programadas</h5>
                            <span class="mini-badge">{{ snapshotScheduledTasks.length }} tareas</span>
                        </div>
                        <div class="table-wrap compact-scroll">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Nombre</th><th>Origen</th><th>Estado</th><th>Siguiente</th></tr></thead>
                                <tbody>
                                    <tr v-for="task in visibleScheduledTasks" :key="`${task.source}-${task.path}-${task.name}`">
                                        <td>
                                            <strong>{{ task.name }}</strong>
                                            <span class="table-subtext">{{ task.description }}</span>
                                        </td>
                                        <td>{{ task.source }}</td>
                                        <td><span class="state-chip" :class="task.enabled ? 'state-chip--ok' : 'state-chip--warn'">{{ task.state || (task.enabled ? 'Activa' : 'Inactiva') }}</span></td>
                                        <td>{{ task.nextRunTime ? formatDateTime(task.nextRunTime) : '—' }}</td>
                                    </tr>
                                    <tr v-if="!visibleScheduledTasks.length">
                                        <td colspan="4" class="text-muted text-center">Sin tareas programadas detectadas.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Cambios detectados</h5>
                            <span class="mini-badge" :class="visibleInventoryChanges.length ? 'badge-warn' : 'badge-ok'">{{ visibleInventoryChanges.length }} cambios</span>
                        </div>
                        <div class="output-box compact-scroll">
                            <pre class="result-pre">{{ visibleInventoryChanges.map(formatInventoryChange).join('\n') || (snapshotInventoryChanges.initialized ? 'Baseline inicial creado. Se avisará en próximos cambios.' : 'Sin cambios desde el último polling.') }}</pre>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <div>
                                <h5>Firewall activo</h5>
                                <small class="table-subtext">Thorondor muestra todo, pero sólo gestiona reglas propias.</small>
                            </div>
                            <span class="mini-badge">{{ snapshotFirewallSummary.total }} reglas</span>
                        </div>
                        <div class="table-wrap compact-scroll">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Tipo</th><th>Proveedor</th><th>Regla</th><th>Acción</th></tr></thead>
                                <tbody>
                                    <tr v-for="rule in thorondorFirewallRules" :key="`own-${rule.provider}-${rule.name}`">
                                        <td><span class="state-chip state-chip--ok">Thorondor</span></td>
                                        <td>{{ rule.provider }}</td>
                                        <td><code class="small-code">{{ rule.name }}</code></td>
                                        <td v-if="rule.managedByThorondor || rule.scope === 'thorondor'">
                                            <button v-if="rule.ip" class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('unblock-ip', { ip: rule.ip, reason: 'Retirada de regla propia Thorondor' })">
                                                Desbloquear
                                            </button>
                                            <span v-else>{{ rule.action || rule.direction || '—' }}</span>
                                        </td>
                                    </tr>
                                    <tr v-for="rule in systemFirewallRules.slice(0, 60)" :key="`sys-${rule.provider}-${rule.name}`">
                                        <td><span class="state-chip state-chip--neutral">Sistema</span></td>
                                        <td>{{ rule.provider }}</td>
                                        <td><code class="small-code">{{ rule.name }}</code></td>
                                        <td>{{ rule.action || rule.direction || '—' }}</td>
                                    </tr>
                                    <tr v-if="!visibleFirewallRules.length">
                                        <td colspan="4" class="text-muted text-center">Sin reglas accesibles o sin permisos de lectura.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Resolución DNS</h5>
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

        <section v-else-if="selectedAgent && detailTab === 'access'" class="section-box">
            <div class="row g-3 mb-4">
                <div class="col-md-6 col-xl" v-for="card in accessSummaryCards" :key="card.label">
                    <div class="signal-card">
                        <label>{{ card.label }}</label>
                        <span :class="card.tone">{{ card.value }}</span>
                        <small>{{ card.note }}</small>
                    </div>
                </div>
            </div>

            <div class="tool-card mb-4">
                <div class="card-head">
                    <div>
                        <h5>Recomendación de respuesta</h5>
                        <small class="table-subtext">Basada en logs nativos de autenticación, sudo, RDP/SSH y bloqueos propios.</small>
                    </div>
                    <span class="mini-badge" :class="snapshotSecurityAccess.severity === 'danger' ? 'badge-danger' : snapshotSecurityAccess.severity === 'warning' ? 'badge-warn' : 'badge-ok'">
                        {{ snapshotSecurityAccess.severity === 'danger' ? 'Alta' : snapshotSecurityAccess.severity === 'warning' ? 'Revisar' : 'Normal' }}
                    </span>
                </div>
                <p class="plain-note">{{ snapshotSecurityAccess.recommendation }}</p>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-4">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>IPs repetidas</h5>
                            <span class="mini-badge">{{ snapshotSecurityAccess.repeatedIps.length }}</span>
                        </div>
                        <div class="table-wrap compact-scroll">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>IP</th><th>Fallos</th><th>Acción</th></tr></thead>
                                <tbody>
                                    <tr v-for="item in snapshotSecurityAccess.repeatedIps" :key="item.value">
                                        <td><code class="small-code">{{ item.value }}</code></td>
                                        <td>{{ item.count }}</td>
                                        <td>
                                            <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('block-ip', { ip: item.value, reason: 'IP repetida en accesos fallidos' })">
                                                Bloquear
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-if="!snapshotSecurityAccess.repeatedIps.length">
                                        <td colspan="3" class="text-muted text-center">Sin IPs repetidas en la muestra actual.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Usuarios atacados</h5>
                            <span class="mini-badge">{{ snapshotSecurityAccess.attackedUsers.length }}</span>
                        </div>
                        <div class="table-wrap compact-scroll">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Usuario</th><th>Fallos</th></tr></thead>
                                <tbody>
                                    <tr v-for="item in snapshotSecurityAccess.attackedUsers" :key="item.value">
                                        <td>{{ item.value }}</td>
                                        <td>{{ item.count }}</td>
                                    </tr>
                                    <tr v-if="!snapshotSecurityAccess.attackedUsers.length">
                                        <td colspan="2" class="text-muted text-center">Sin usuarios atacados.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Canales detectados</h5>
                            <span class="mini-badge">SSH / RDP / sudo</span>
                        </div>
                        <div class="table-wrap compact-scroll">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Canal</th><th>Eventos</th></tr></thead>
                                <tbody>
                                    <tr v-for="item in snapshotSecurityAccess.protocols" :key="item.value">
                                        <td>{{ item.value }}</td>
                                        <td>{{ item.count }}</td>
                                    </tr>
                                    <tr v-if="!snapshotSecurityAccess.protocols.length">
                                        <td colspan="2" class="text-muted text-center">Sin canales destacados.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tool-card">
                <div class="card-head">
                    <div>
                        <h5>Acciones seguras</h5>
                        <small class="table-subtext">{{ safeActionGuardMessage }}</small>
                    </div>
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('check-host-health')">
                        Comprobar salud
                    </button>
                </div>
                <p v-if="safeActionFeedback.message" class="management-feedback" :class="`is-${safeActionFeedback.type}`">
                    {{ safeActionFeedback.message }}
                </p>
                <div class="safe-action-grid">
                    <div class="control-field">
                        <label class="field-label" for="safe-ip">IP</label>
                        <input id="safe-ip" v-model.trim="safeActionDraft.ip" class="form-control input-dark" placeholder="203.0.113.10" />
                    </div>
                    <div class="control-field">
                        <label class="field-label" for="safe-service">Servicio</label>
                        <select id="safe-service" v-model="safeActionDraft.serviceName" class="form-select input-dark">
                            <option value="">Selecciona servicio</option>
                            <option v-for="service in safeServiceOptions" :key="service.name" :value="service.name">{{ service.displayName || service.name }}</option>
                        </select>
                    </div>
                    <div class="control-field">
                        <label class="field-label" for="safe-user">Sesión</label>
                        <select id="safe-user" v-model="safeActionDraft.username" class="form-select input-dark">
                            <option value="">Selecciona usuario</option>
                            <option v-for="user in connectedUsersForSelected" :key="`${user.name}-${user.sessionId || user.terminal}`" :value="user.name">{{ user.name }} {{ user.sessionId ? `#${user.sessionId}` : '' }}</option>
                        </select>
                    </div>
                    <div class="control-field">
                        <label class="field-label" for="safe-reason">Motivo</label>
                        <input id="safe-reason" v-model.trim="safeActionDraft.reason" class="form-control input-dark" placeholder="Referencia o motivo operativo" />
                    </div>
                </div>
                <div class="table-actions mt-3">
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('block-ip')">Bloquear IP</button>
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('unblock-ip')">Desbloquear IP</button>
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('restart-service')">Reiniciar servicio</button>
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('collect-logs')">Recoger logs</button>
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('list-connected-users')">Listar usuarios</button>
                    <button class="btn btn-quiet" :disabled="safeActionBusy || !canManageSafeActions" @click="queueSafeAction('terminate-user-session')">Cerrar sesión</button>
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

        <section v-else-if="selectedAgent && detailTab === 'users'" class="section-box">
            <div class="row g-3 mb-4">
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Usuarios inventariados</label>
                        <span class="tone-neutral">{{ hostUsers.length }}</span>
                        <small>{{ userInventoryLabel }}</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Grupos</label>
                        <span class="tone-neutral">{{ hostGroups.length }}</span>
                        <small>{{ privilegedGroups.length }} grupos sensibles.</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Privilegiados</label>
                        <span :class="privilegedUsers.length ? 'tone-warning' : 'tone-success'">{{ privilegedUsers.length }}</span>
                        <small>Usuarios en grupos administrativos.</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Bloqueados</label>
                        <span :class="disabledUsers.length ? 'tone-warning' : 'tone-success'">{{ disabledUsers.length }}</span>
                        <small>Usuarios bloqueados o deshabilitados.</small>
                    </div>
                </div>
            </div>

            <div class="tool-card user-management-card mb-4">
                <div class="card-head">
                    <h5>Gestión de usuarios</h5>
                    <span class="mini-badge">{{ canManageHostUsers ? 'API central' : 'Solo lectura' }}</span>
                </div>
                <p class="section-copy mb-3">
                    Las acciones se encolan en la API central y el agente las ejecuta en su siguiente ciclo de sincronización.
                </p>
                <div class="control-grid user-management-grid">
                    <label class="control-field" for="user-management-type">
                        <span class="field-label">Acción</span>
                        <select id="user-management-type" v-model="userManagementDraft.type" class="form-select input-dark">
                            <option value="refresh-user-inventory">Actualizar inventario</option>
                            <option value="disable-user">Bloquear/deshabilitar usuario</option>
                            <option value="enable-user">Habilitar/desbloquear usuario</option>
                            <option value="add-user-to-group">Añadir a grupo</option>
                            <option value="remove-user-from-group">Quitar de grupo</option>
                        </select>
                    </label>
                    <label class="control-field" for="user-management-username">
                        <span class="field-label">Usuario</span>
                        <select id="user-management-username" v-model="userManagementDraft.username" class="form-select input-dark" :disabled="!userManagementRequiresUser">
                            <option value="">{{ userManagementRequiresUser ? 'Selecciona usuario' : 'No requerido' }}</option>
                            <option v-for="user in hostUsers" :key="user.name" :value="user.name">{{ user.name }}</option>
                        </select>
                    </label>
                    <label class="control-field" for="user-management-group">
                        <span class="field-label">Grupo</span>
                        <select id="user-management-group" v-model="userManagementDraft.group" class="form-select input-dark" :disabled="!userManagementRequiresGroup">
                            <option value="">{{ userManagementRequiresGroup ? 'Selecciona grupo' : 'No requerido' }}</option>
                            <option v-for="group in hostGroups" :key="group.name" :value="group.name">{{ group.name }}</option>
                        </select>
                    </label>
                    <label class="control-field" for="user-management-reason">
                        <span class="field-label">Motivo</span>
                        <input id="user-management-reason" v-model.trim="userManagementDraft.reason" class="form-control input-dark" placeholder="Motivo operativo o referencia de caso" />
                    </label>
                </div>
                <p v-if="userManagementFeedback.message" class="operation-feedback" :class="`operation-feedback--${userManagementFeedback.type}`">
                    {{ userManagementFeedback.message }}
                </p>
                <div class="inline-actions">
                    <button class="btn btn-main" :disabled="!canSubmitUserManagement" @click="queueUserManagementCommand()">
                        {{ userManagementBusy ? 'Encolando...' : userManagementActionLabel }}
                    </button>
                    <button class="btn btn-subtle" :disabled="userManagementBusy || !canManageHostUsers" @click="queueUserManagementCommand('refresh-user-inventory')">
                        Refrescar inventario
                    </button>
                </div>
                <small class="management-guard-note">{{ userManagementGuardMessage }}</small>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-8">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Usuarios del host</h5>
                            <span class="mini-badge">{{ hostUsers.length }} usuarios</span>
                        </div>
                        <div class="table-wrap scrollable-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Estado</th>
                                        <th>Grupos</th>
                                        <th>Shell / SID</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="user in hostUsers" :key="user.name">
                                        <td>
                                            <strong>{{ user.name }}</strong>
                                            <small class="table-subtext">{{ user.fullName || user.home || user.description || '-' }}</small>
                                        </td>
                                        <td>
                                            <span class="state-chip" :class="user.disabled || user.locked ? 'chip-warning' : 'chip-success'">
                                                {{ user.disabled || user.locked ? 'Bloqueado' : 'Activo' }}
                                            </span>
                                            <span v-if="user.privileged" class="mini-badge badge-warn ms-1">Privilegiado</span>
                                        </td>
                                        <td class="groups-cell">{{ formatUserGroups(user.groups) }}</td>
                                        <td><code class="small-code">{{ user.shell || user.sid || '-' }}</code></td>
                                        <td>
                                            <div class="table-actions user-table-actions">
                                                <button class="btn btn-quiet" :disabled="!canManageHostUsers || userManagementBusy" @click="queueUserQuickCommand(user.disabled || user.locked ? 'enable-user' : 'disable-user', user)">
                                                    {{ user.disabled || user.locked ? 'Habilitar' : 'Bloquear' }}
                                                </button>
                                                <button class="btn btn-quiet" :disabled="!canManageHostUsers || userManagementBusy" @click="primeGroupAction(user)">
                                                    Grupo
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr v-if="!hostUsers.length">
                                        <td colspan="5" class="text-muted text-center">El agente todavía no ha enviado inventario de usuarios.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Grupos del host</h5>
                            <span class="mini-badge">{{ hostGroups.length }} grupos</span>
                        </div>
                        <div class="host-group-list scrollable-wrap">
                            <article v-for="group in hostGroups" :key="group.name" class="host-group-row">
                                <strong>{{ group.name }}</strong>
                                <span>{{ (group.members || []).length }} miembros</span>
                                <small>{{ (group.members || []).slice(0, 8).join(', ') || 'Sin miembros' }}</small>
                            </article>
                            <div v-if="!hostGroups.length" class="empty-box compact-empty">Sin grupos reportados.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Usuarios conectados</label>
                        <span class="tone-success">{{ connectedUsersForSelected.length }}</span>
                        <small>Sesiones activas reportadas por el agente.</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Accesos exitosos</label>
                        <span class="tone-neutral">{{ successfulLoginsForSelected.length }}</span>
                        <small>Eventos de autenticación aceptada.</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Accesos fallidos</label>
                        <span :class="failedLoginsForSelected.length ? 'tone-warning' : 'tone-success'">{{ failedLoginsForSelected.length }}</span>
                        <small>Intentos rechazados para el host.</small>
                    </div>
                </div>
                <div class="col-md-6 col-xl-3">
                    <div class="signal-card">
                        <label>Cambios de usuario</label>
                        <span :class="newUserEventsForSelected.length ? 'tone-warning' : 'tone-neutral'">{{ newUserEventsForSelected.length }}</span>
                        <small>Altas o cambios detectados.</small>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-7">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Sesiones activas</h5>
                            <span class="mini-badge">{{ connectedUsersForSelected.length }} usuarios</span>
                        </div>
                        <div class="table-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Terminal</th>
                                        <th>Origen</th>
                                        <th>Inicio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="user in connectedUsersForSelected" :key="`${user.name}-${user.terminal}-${user.started}`">
                                        <td>{{ user.name || 'N/D' }}</td>
                                        <td><code class="small-code">{{ user.terminal || '-' }}</code></td>
                                        <td>{{ user.host || 'local' }}</td>
                                        <td>{{ formatUserStarted(user.started) }}</td>
                                    </tr>
                                    <tr v-if="!connectedUsersForSelected.length">
                                        <td colspan="4" class="text-muted text-center">Sin usuarios conectados en la última telemetría.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-5">
                    <div class="tool-card h-100">
                        <div class="card-head">
                            <h5>Historial de logins</h5>
                            <span class="mini-badge">{{ snapshotLoginHistory.length }} entradas</span>
                        </div>
                        <div class="output-box scrollable-wrap" style="max-height:260px;">
                            <pre class="result-pre">{{ snapshotLoginHistory.join('\n') || 'Sin historial de logins disponible.' }}</pre>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3">
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Accesos fallidos</h5>
                            <span class="mini-badge">Auth</span>
                        </div>
                        <div class="table-wrap scrollable-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Usuario</th><th>IP</th><th>Fecha</th></tr></thead>
                                <tbody>
                                    <tr v-for="event in failedLoginsForSelected" :key="event.id">
                                        <td>{{ event.user }}</td>
                                        <td>{{ event.sourceIp }}</td>
                                        <td>{{ formatDateTime(event.timestamp) }}</td>
                                    </tr>
                                    <tr v-if="!failedLoginsForSelected.length">
                                        <td colspan="3" class="text-muted text-center">Sin accesos fallidos registrados.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6">
                    <div class="tool-card">
                        <div class="card-head">
                            <h5>Accesos exitosos y cambios</h5>
                            <span class="mini-badge">{{ successfulLoginsForSelected.length + newUserEventsForSelected.length }} eventos</span>
                        </div>
                        <div class="table-wrap scrollable-wrap">
                            <table class="table table-dark table-sm align-middle mb-0">
                                <thead><tr><th>Tipo</th><th>Usuario</th><th>Origen</th><th>Fecha</th></tr></thead>
                                <tbody>
                                    <tr v-for="event in userTimelineEvents" :key="event.id">
                                        <td>{{ humanizeEventKind(event.kind) }}</td>
                                        <td>{{ event.user || '-' }}</td>
                                        <td>{{ event.sourceIp || '-' }}</td>
                                        <td>{{ formatDateTime(event.timestamp) }}</td>
                                    </tr>
                                    <tr v-if="!userTimelineEvents.length">
                                        <td colspan="4" class="text-muted text-center">Sin eventos de usuario registrados.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                    <input id="log-search" v-model="logFilters.text" class="form-control input-dark" placeholder="Filtro de texto libre" />
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
                            <th>Descripción</th>
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

        <section v-else-if="!selectedAgent && detailTab === 'overview'" class="section-box host-screen-preview host-screen-preview--overview">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Dashboard del host</span>
                    <h2 class="section-name">Resumen operativo pendiente</h2>
                    <p class="section-copy">Cuando selecciones un agente, este panel mostrará salud, recursos, errores de recogida, cambios relevantes y alertas abiertas del host.</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Sin host</span>
                    <small>{{ dashboardCards.length ? "Selecciona un agente en la barra lateral." : "Registra un agente para iniciar el panel." }}</small>
                </div>
            </div>

            <div class="host-preview-control-grid">
                <label class="control-field" for="empty-overview-range">
                    <span class="field-label">Ventana</span>
                    <select id="empty-overview-range" v-model="emptyHostFilters.overview.range" class="form-select input-dark">
                        <option value="24h">Últimas 24 horas</option>
                        <option value="7d">Últimos 7 días</option>
                        <option value="30d">Últimos 30 días</option>
                    </select>
                    <small>Define el periodo del resumen cuando haya telemetría.</small>
                </label>
                <label class="control-field" for="empty-overview-report">
                    <span class="field-label">Prioridad</span>
                    <select id="empty-overview-report" v-model="emptyHostFilters.overview.report" class="form-select input-dark">
                        <option value="health">Salud del host</option>
                        <option value="performance">Rendimiento</option>
                        <option value="security">Seguridad</option>
                    </select>
                    <small>Ordena los bloques principales del dashboard.</small>
                </label>
            </div>

            <dl class="host-overview-preview-list">
                <div>
                    <dt>Estado del agente</dt>
                    <dd>Heartbeat, latencia, versión, endpoint y errores de colección.</dd>
                </div>
                <div>
                    <dt>Recursos</dt>
                    <dd>CPU, RAM, swap, disco, sensores y tendencia histórica.</dd>
                </div>
                <div>
                    <dt>Riesgo operativo</dt>
                    <dd>Servicios caídos, cambios de baseline, actualizaciones pendientes y alertas.</dd>
                </div>
                <div>
                    <dt>Actividad reciente</dt>
                    <dd>Usuarios conectados, logs relevantes, accesos fallidos y acciones ejecutadas.</dd>
                </div>
            </dl>
        </section>

        <section v-else-if="!selectedAgent && detailTab === 'logs'" class="section-box host-screen-preview host-screen-preview--logs">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Logs</span>
                    <h2 class="section-name">Consulta de logs preparada</h2>
                    <p class="section-copy">Esta pantalla tendrá filtros de lectura, exportación y búsqueda sobre las fuentes que el agente detecte en el host.</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Tail</span>
                    <small>Solo fuentes existentes en el sistema monitorizado.</small>
                </div>
            </div>

            <div class="host-preview-control-grid host-preview-control-grid--three">
                <label class="control-field" for="empty-log-source">
                    <span class="field-label">Fuente</span>
                    <select id="empty-log-source" v-model="emptyHostFilters.logs.source" class="form-select input-dark">
                        <option value="all">Todas</option>
                        <option value="system">Sistema</option>
                        <option value="auth">Autenticación</option>
                        <option value="web">Web / proxy</option>
                        <option value="firewall">Firewall / IDS</option>
                    </select>
                </label>
                <label class="control-field" for="empty-log-level">
                    <span class="field-label">Nivel</span>
                    <select id="empty-log-level" v-model="emptyHostFilters.logs.level" class="form-select input-dark">
                        <option value="all">Todos</option>
                        <option value="INFO">INFO</option>
                        <option value="WARNING">WARNING</option>
                        <option value="ERROR">ERROR</option>
                        <option value="CRITICAL">CRITICAL</option>
                    </select>
                </label>
                <label class="control-field" for="empty-log-text">
                    <span class="field-label">Texto</span>
                    <input id="empty-log-text" class="form-control input-dark" placeholder="IP, usuario, servicio o mensaje" disabled />
                </label>
            </div>

            <div class="host-preview-table">
                <table>
                    <thead><tr><th>Fecha</th><th>Fuente</th><th>Nivel</th><th>Mensaje</th></tr></thead>
                    <tbody>
                        <tr><td colspan="4">Selecciona un agente para cargar líneas normalizadas de syslog, auth, nginx/apache, firewall, PHP, base de datos o IDS.</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="host-preview-actions">
                <button class="btn btn-subtle" disabled>Exportar JSON</button>
                <button class="btn btn-subtle" disabled>Exportar CSV</button>
                <span>Los botones se activan cuando exista un host seleccionado y logs filtrados.</span>
            </div>
        </section>

        <section v-else-if="!selectedAgent && detailTab === 'hardware'" class="section-box host-screen-preview host-screen-preview--hardware">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Hardware</span>
                    <h2 class="section-name">Inventario físico pendiente</h2>
                    <p class="section-copy">La pantalla de hardware separa uso actual, inventario físico, almacenamiento, sensores, GPU y estado SMART.</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Sensores</span>
                    <small>El agente mostrará solo lo que el host exponga.</small>
                </div>
            </div>

            <div class="host-preview-control-grid">
                <label class="control-field" for="empty-hardware-component">
                    <span class="field-label">Componente</span>
                    <select id="empty-hardware-component" v-model="emptyHostFilters.hardware.component" class="form-select input-dark">
                        <option value="all">Todo</option>
                        <option value="cpu">CPU</option>
                        <option value="memory">RAM</option>
                        <option value="disk">Discos</option>
                        <option value="sensors">Sensores / GPU</option>
                    </select>
                </label>
                <label class="control-field" for="empty-hardware-view">
                    <span class="field-label">Vista</span>
                    <select id="empty-hardware-view" v-model="emptyHostFilters.hardware.view" class="form-select input-dark">
                        <option value="usage">Uso actual</option>
                        <option value="inventory">Inventario</option>
                        <option value="health">Salud física</option>
                    </select>
                </label>
            </div>

            <ul class="host-hardware-preview-list">
                <li><strong>CPU</strong><span>Modelo, fabricante, núcleos, frecuencia, carga total y uso por núcleo.</span></li>
                <li><strong>RAM</strong><span>Total, usada, libre, módulos físicos, velocidad y fabricante cuando esté disponible.</span></li>
                <li><strong>Discos</strong><span>Particiones, libre/ocupado, discos físicos, tipo, serie y SMART.</span></li>
                <li><strong>Sensores</strong><span>Temperaturas, ventiladores, batería/UPS, GPU, VRAM, driver y uso.</span></li>
            </ul>
        </section>

        <section v-else-if="!selectedAgent && detailTab === 'processes'" class="section-box host-screen-preview host-screen-preview--processes">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Procesos</span>
                    <h2 class="section-name">Procesos vivos del host</h2>
                    <p class="section-copy">Esta pantalla cruza procesos con consumo, usuario propietario, comando de arranque y actividad de red asociada.</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">PID</span>
                    <small>CPU, RAM, usuario, estado y sockets vinculados.</small>
                </div>
            </div>

            <div class="host-preview-control-grid host-preview-control-grid--three">
                <label class="control-field" for="empty-process-sort">
                    <span class="field-label">Orden</span>
                    <select id="empty-process-sort" v-model="emptyHostFilters.processes.sort" class="form-select input-dark">
                        <option value="cpu">Mayor CPU</option>
                        <option value="memory">Mayor memoria</option>
                        <option value="ports">Actividad de red</option>
                        <option value="name">Nombre</option>
                    </select>
                </label>
                <label class="control-field" for="empty-process-state">
                    <span class="field-label">Estado</span>
                    <select id="empty-process-state" v-model="emptyHostFilters.processes.state" class="form-select input-dark">
                        <option value="all">Todos</option>
                        <option value="running">Running</option>
                        <option value="sleeping">Sleeping</option>
                        <option value="zombie">Zombie</option>
                    </select>
                </label>
                <label class="control-field" for="empty-process-search">
                    <span class="field-label">Buscar</span>
                    <input id="empty-process-search" class="form-control input-dark" placeholder="Proceso, PID, usuario o comando" disabled />
                </label>
            </div>

            <div class="host-preview-table">
                <table>
                    <thead><tr><th>Proceso</th><th>PID</th><th>Usuario</th><th>CPU</th><th>RAM</th><th>Red</th></tr></thead>
                    <tbody>
                        <tr><td colspan="6">Selecciona un agente para ver procesos reales, consumo, RSS, hilos, cmdline y relación con puertos/conexiones.</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section v-else-if="!selectedAgent && detailTab === 'network'" class="section-box host-screen-preview host-screen-preview--network">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Red</span>
                    <h2 class="section-name">Puertos, conexiones y firewall</h2>
                    <p class="section-copy">La vista de red separa interfaces, velocidades, puertos abiertos, conexiones establecidas y reglas de firewall.</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Sockets</span>
                    <small>TCP LISTEN, UDP, ESTABLISHED e inventario de reglas.</small>
                </div>
            </div>

            <div class="host-preview-control-grid">
                <label class="control-field" for="empty-network-view">
                    <span class="field-label">Informe</span>
                    <select id="empty-network-view" v-model="emptyHostFilters.network.view" class="form-select input-dark">
                        <option value="ports">Puertos abiertos</option>
                        <option value="connections">Conexiones</option>
                        <option value="interfaces">Interfaces</option>
                        <option value="firewall">Firewall</option>
                    </select>
                </label>
                <label class="control-field" for="empty-network-protocol">
                    <span class="field-label">Protocolo</span>
                    <select id="empty-network-protocol" v-model="emptyHostFilters.network.protocol" class="form-select input-dark">
                        <option value="all">Todos</option>
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                    </select>
                </label>
            </div>

            <div class="host-network-preview-layout">
                <dl>
                    <div><dt>Interfaces</dt><dd>IP, tráfico RX/TX, adaptador y velocidad si el host la reporta.</dd></div>
                    <div><dt>Puertos</dt><dd>Dirección local, puerto, protocolo, proceso, PID, usuario y estado.</dd></div>
                    <div><dt>Conexiones</dt><dd>Local/remoto, estado, proceso y PID de sesiones activas.</dd></div>
                    <div><dt>Firewall</dt><dd>Reglas del sistema separadas de reglas propias de Thorondor.</dd></div>
                </dl>
            </div>
        </section>

        <section v-else-if="!selectedAgent && detailTab === 'users'" class="section-box host-screen-preview host-screen-preview--users">
            <div class="section-topline">
                <div class="module-header">
                    <span class="section-kicker">Usuarios</span>
                    <h2 class="section-name">Usuarios, grupos y accesos</h2>
                    <p class="section-copy">Esta pantalla mostrará inventario local, grupos sensibles, sesiones conectadas e historial de autenticación.</p>
                </div>
                <div class="phase-badge-block">
                    <span class="phase-badge">Identidad</span>
                    <small>Inventario local y actividad de acceso.</small>
                </div>
            </div>

            <div class="host-preview-control-grid">
                <label class="control-field" for="empty-users-view">
                    <span class="field-label">Informe</span>
                    <select id="empty-users-view" v-model="emptyHostFilters.users.view" class="form-select input-dark">
                        <option value="inventory">Inventario</option>
                        <option value="sessions">Sesiones activas</option>
                        <option value="logins">Historial de logins</option>
                        <option value="privileged">Privilegios</option>
                    </select>
                </label>
                <label class="control-field" for="empty-users-scope">
                    <span class="field-label">Ámbito</span>
                    <select id="empty-users-scope" v-model="emptyHostFilters.users.scope" class="form-select input-dark">
                        <option value="all">Todos</option>
                        <option value="privileged">Privilegiados</option>
                        <option value="disabled">Bloqueados</option>
                        <option value="connected">Conectados</option>
                    </select>
                </label>
            </div>

            <div class="host-preview-table">
                <table>
                    <thead><tr><th>Usuario</th><th>Estado</th><th>Grupos</th><th>Último acceso</th><th>Acción</th></tr></thead>
                    <tbody>
                        <tr><td colspan="5">Selecciona un agente para consultar usuarios reales, grupos, sesiones, logins fallidos y acciones auditadas.</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="host-preview-actions">
                <button class="btn btn-subtle" disabled>Actualizar inventario</button>
                <button class="btn btn-subtle" disabled>Bloquear usuario</button>
                <button class="btn btn-subtle" disabled>Gestionar grupo</button>
                <span>Las acciones se activan con host seleccionado, JWT válido y permisos de administrador.</span>
            </div>
        </section>

        <section v-else class="section-box host-screen-preview">
            <div class="empty-box">Selecciona un agente en la barra lateral para cargar esta pantalla.</div>
        </section>
    </ThorondorPageShell>
</template>

<script>
import ThorondorLineChart from "@/components/Thorondor/ThorondorLineChart.vue";
import ThorondorPageShell from "@/components/Thorondor/ThorondorPageShell.vue";
import thorondorBaseMixin from "@/features/thorondor/mixins/thorondorBaseMixin";
import { THORONDOR_LOG_SOURCES } from "@/features/thorondor/data/thorondorDefaults";
import { deriveThorondorAgentStatus, isThorondorAgentAlertsPaused } from "@/features/thorondor/services/thorondorRules";
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
            },
            emptyHostFilters: {
                overview: { range: "24h", report: "health" },
                logs: { source: "all", level: "all" },
                hardware: { component: "all", view: "usage" },
                processes: { sort: "cpu", state: "all" },
                network: { view: "ports", protocol: "all" },
                users: { view: "inventory", scope: "all" },
                infra: { view: "services", scope: "all" },
                access: { view: "failed", range: "24h" },
                security: { view: "baseline", severity: "all" },
                alerts: { status: "active", severity: "all" },
                history: { range: "7d", metric: "resources" }
            },
            processFilters: {
                text: "",
                sort: "cpu"
            },
            userManagementDraft: {
                type: "refresh-user-inventory",
                username: "",
                group: "",
                reason: ""
            },
            userManagementBusy: false,
            userManagementFeedback: {
                type: "",
                message: ""
            },
            serviceManagementBusy: "",
            serviceManagementFeedback: {
                type: "",
                message: ""
            },
            maintenanceDraft: {
                minutes: 60,
                reason: ""
            },
            maintenanceBusy: false,
            maintenanceFeedback: {
                type: "",
                message: ""
            },
            safeActionDraft: {
                ip: "",
                serviceName: "",
                username: "",
                sessionId: "",
                reason: ""
            },
            safeActionBusy: "",
            safeActionFeedback: {
                type: "",
                message: ""
            }
        };
    },

    computed: {
        logSourceOptions() {
            return THORONDOR_LOG_SOURCES;
        },

        detailTabs() {
            return [
                { id: "overview", label: "Dashboard del host" },
                { id: "hardware", label: "Hardware" },
                { id: "processes", label: "Procesos" },
                { id: "network", label: "Red" },
                { id: "users", label: "Usuarios" },
                { id: "infra", label: "Infraestructura" },
                { id: "access", label: "Accesos" },
                { id: "security", label: "Seguridad" },
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
            const changeCount = this.snapshotInventoryChanges.events?.length || 0;

            const cards = [
                { label: "Hostname", value: this.selectedLatestSnapshot.hostname, tone: "tone-neutral", note: this.selectedLatestSnapshot.localIp },
                { label: "Endpoint", value: this.agentEndpoint(this.selectedAgent), tone: "tone-blue", note: this.networkScopeLabel(this.selectedAgent) },
                { label: "Estado", value: status.label, tone: status.color === "success" ? "tone-success" : (status.color === "warning" ? "tone-warning" : "tone-danger"), note: status.note },
                { label: "Agente", value: this.snapshotAgentStatus.version || this.selectedAgent.agentVersion || "N/D", tone: "tone-blue", note: this.snapshotAgentStatus.requestLatencyMs ? `${this.snapshotAgentStatus.requestLatencyMs} ms` : "latencia pendiente" },
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
            if (changeCount > 0) {
                cards.push({ label: "Cambios", value: `${changeCount}`, tone: "tone-warning", note: "Inventario modificado" });
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

        diskCapacity() {
            const disks = this.selectedLatestSnapshot?.disks || [];
            const total = disks.reduce((sum, disk) => sum + (Number(disk.total) || 0), 0);
            const used = disks.reduce((sum, disk) => sum + (Number(disk.used) || 0), 0);
            const free = disks.reduce((sum, disk) => sum + (Number(disk.free) || Math.max((Number(disk.total) || 0) - (Number(disk.used) || 0), 0)), 0);
            return {
                total,
                used,
                free,
                percent: total ? (used / total) * 100 : 0
            };
        },

        maxTemperatureReading() {
            const values = (this.selectedLatestSnapshot?.temperatures || [])
                .map((sensor) => Number(sensor.current))
                .filter((value) => Number.isFinite(value));
            return values.length ? Math.max(...values) : null;
        },

        maxGpuUsage() {
            const values = this.snapshotGpu
                .map((gpu) => Number(gpu.utilPercent))
                .filter((value) => Number.isFinite(value));
            return values.length ? Math.max(...values) : null;
        },

        hardwareUsageCards() {
            const cpuModel = this.snapshotHardware?.cpuModel || "CPU";
            const gpuName = this.snapshotGpu[0]?.name || "Sin GPU reportada";
            return [
                {
                    label: "CPU",
                    value: this.formatPercent(this.selectedLatestSnapshot?.cpuTotal),
                    note: `${cpuModel} · ${this.snapshotHardware?.cpuCoresLogical || this.selectedLatestSnapshot?.cpuPerCore?.length || 0} hilos`,
                    tone: this.usageTone(this.selectedLatestSnapshot?.cpuTotal),
                    width: this.barWidth(this.selectedLatestSnapshot?.cpuTotal)
                },
                {
                    label: "RAM",
                    value: this.formatPercent(this.selectedLatestSnapshot?.memoryPercent),
                    note: `${this.formatBytes(this.selectedLatestSnapshot?.memoryUsed)} / ${this.formatBytes(this.selectedLatestSnapshot?.memoryTotal)}`,
                    tone: this.usageTone(this.selectedLatestSnapshot?.memoryPercent),
                    width: this.barWidth(this.selectedLatestSnapshot?.memoryPercent)
                },
                {
                    label: "GPU",
                    value: this.maxGpuUsage == null ? "N/D" : this.formatPercent(this.maxGpuUsage),
                    note: gpuName,
                    tone: this.maxGpuUsage == null ? "tone-neutral" : this.usageTone(this.maxGpuUsage),
                    width: this.maxGpuUsage == null ? "0%" : this.barWidth(this.maxGpuUsage)
                },
                {
                    label: "Disco",
                    value: this.formatPercent(this.diskCapacity.percent),
                    note: `${this.formatBytes(this.diskCapacity.free)} libres`,
                    tone: this.usageTone(this.diskCapacity.percent),
                    width: this.barWidth(this.diskCapacity.percent)
                },
                {
                    label: "Temperatura",
                    value: this.maxTemperatureReading == null ? "N/D" : `${this.maxTemperatureReading.toFixed(1)}°C`,
                    note: `${this.selectedLatestSnapshot?.temperatures?.length || 0} sensores`,
                    tone: this.maxTemperatureReading == null ? "tone-neutral" : this.tempColorClass(this.maxTemperatureReading),
                    width: this.temperatureWidth(this.maxTemperatureReading)
                }
            ];
        },

        hardwareIdentityRows() {
            const hardware = this.snapshotHardware || {};
            const board = hardware.baseboard || {};
            const bios = hardware.bios || {};
            return [
                { label: "CPU", value: hardware.cpuModel || "N/D" },
                { label: "Proveedor CPU", value: hardware.cpuVendor || "N/D" },
                { label: "Núcleos", value: `${hardware.cpuCoresPhysical || "N/D"} físicos / ${hardware.cpuCoresLogical || "N/D"} lógicos` },
                { label: "Frecuencia", value: this.formatMhz(hardware.cpuFreqMhz, hardware.cpuMaxFreqMhz) },
                { label: "RAM total", value: hardware.totalRamGb ? `${hardware.totalRamGb} GB` : this.formatBytes(this.selectedLatestSnapshot?.memoryTotal) },
                { label: "Equipo", value: [hardware.systemManufacturer, hardware.systemModel].filter(Boolean).join(" · ") || "N/D" },
                { label: "Arquitectura", value: hardware.osArchitecture || hardware.systemType || "N/D" },
                { label: "Placa base", value: [board.manufacturer, board.product].filter(Boolean).join(" · ") || "N/D" },
                { label: "BIOS", value: [bios.manufacturer, bios.version].filter(Boolean).join(" · ") || "N/D" }
            ];
        },

        cpuCoreReadings() {
            return (this.selectedLatestSnapshot?.cpuPerCore || []).map((value, index) => ({
                label: `CPU ${index + 1}`,
                value: Number(value) || 0
            }));
        },

        memoryModuleRows() {
            return this.snapshotHardware?.memoryModules || [];
        },

        physicalDiskRows() {
            return this.snapshotHardware?.physicalDisks || [];
        },

        snapshotProcesses() {
            return this.selectedLatestSnapshot?.processes || [];
        },

        snapshotOpenPorts() {
            return this.selectedLatestSnapshot?.openPorts || [];
        },

        processPortMap() {
            return this.snapshotOpenPorts.reduce((acc, port) => {
                const pid = Number(port.pid) || 0;
                if (!pid) return acc;
                acc[pid] = (acc[pid] || 0) + 1;
                return acc;
            }, {});
        },

        processConnectionMap() {
            return this.snapshotEstablished.reduce((acc, conn) => {
                const pid = Number(conn.pid) || 0;
                if (!pid) return acc;
                acc[pid] = (acc[pid] || 0) + 1;
                return acc;
            }, {});
        },

        processRows() {
            return this.snapshotProcesses.map((process) => ({
                ...process,
                portCount: this.processPortMap[Number(process.pid) || 0] || 0,
                connectionCount: this.processConnectionMap[Number(process.pid) || 0] || 0
            }));
        },

        filteredProcessRows() {
            const needle = this.processFilters.text.trim().toLowerCase();
            const rows = needle
                ? this.processRows.filter((process) => [
                    process.name,
                    process.user,
                    process.status,
                    process.pid,
                    process.cmdline,
                    process.exe
                ].some((value) => String(value || "").toLowerCase().includes(needle)))
                : [...this.processRows];

            const sorters = {
                cpu: (a, b) => (Number(b.cpuPercent) || 0) - (Number(a.cpuPercent) || 0),
                memory: (a, b) => (Number(b.memoryRss) || 0) - (Number(a.memoryRss) || 0) || (Number(b.memoryPercent) || 0) - (Number(a.memoryPercent) || 0),
                ports: (a, b) => (Number(b.portCount) || 0) - (Number(a.portCount) || 0) || (Number(b.connectionCount) || 0) - (Number(a.connectionCount) || 0),
                pid: (a, b) => (Number(a.pid) || 0) - (Number(b.pid) || 0),
                name: (a, b) => String(a.name || "").localeCompare(String(b.name || ""))
            };

            return rows.sort(sorters[this.processFilters.sort] || sorters.cpu);
        },

        processSummaryCards() {
            const total = Number(this.selectedLatestSnapshot?.processCount) || this.processRows.length;
            const visible = this.processRows.length;
            const highCpu = this.processRows.filter((process) => Number(process.cpuPercent) >= 25).length;
            const highRam = this.processRows.filter((process) => Number(process.memoryPercent) >= 10).length;
            const networkPids = new Set([
                ...Object.keys(this.processPortMap),
                ...Object.keys(this.processConnectionMap)
            ]);
            return [
                { label: "Procesos", value: total, note: visible === total ? "muestra completa" : `${visible} en muestra` },
                { label: "CPU alta", value: highCpu, note: "procesos >= 25%" },
                { label: "RAM alta", value: highRam, note: "procesos >= 10%" },
                { label: "Con red", value: networkPids.size, note: "PID con puertos o conexiones" }
            ];
        },

        topProcesses() {
            return this.processRows.slice(0, 10);
        },

        failedLoginsForSelected() {
            return this.selectedSecurityEvents.filter((event) => event.kind === "failed_login");
        },

        successfulLoginsForSelected() {
            return this.selectedSecurityEvents.filter((event) => event.kind === "successful_login");
        },

        newUserEventsForSelected() {
            return this.selectedSecurityEvents.filter((event) => event.kind === "new_user");
        },

        userTimelineEvents() {
            return [
                ...this.successfulLoginsForSelected,
                ...this.newUserEventsForSelected
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        },

        connectedUsersForSelected() {
            return this.selectedLatestSnapshot?.connectedUsers || [];
        },

        selectedUserInventory() {
            return this.selectedLatestSnapshot?.userInventory || {
                collectedAt: "",
                os: "",
                users: [],
                groups: [],
                privilegedGroups: []
            };
        },

        hostUsers() {
            return [...(this.selectedUserInventory.users || [])].sort((a, b) => {
                const privilegedDelta = Number(Boolean(b.privileged)) - Number(Boolean(a.privileged));
                if (privilegedDelta) return privilegedDelta;
                return String(a.name || "").localeCompare(String(b.name || ""));
            });
        },

        hostGroups() {
            return [...(this.selectedUserInventory.groups || [])].sort((a, b) => {
                const privilegedDelta = Number(Boolean(b.privileged)) - Number(Boolean(a.privileged));
                if (privilegedDelta) return privilegedDelta;
                return String(a.name || "").localeCompare(String(b.name || ""));
            });
        },

        privilegedUsers() {
            return this.hostUsers.filter((user) => user.privileged);
        },

        disabledUsers() {
            return this.hostUsers.filter((user) => user.disabled || user.locked);
        },

        privilegedGroups() {
            return this.hostGroups.filter((group) => group.privileged);
        },

        userInventoryLabel() {
            if (!this.selectedUserInventory.collectedAt) return "Pendiente del siguiente polling.";
            return `Actualizado ${this.formatDateTime(this.selectedUserInventory.collectedAt)}`;
        },

        currentSessionUser() {
            return this.thorondorState.session?.user || null;
        },

        isCurrentUserAdmin() {
            return Boolean(
                this.currentSessionUser?.usuarioAdmin
                    || this.currentSessionUser?.usuario_admin
                    || this.currentSessionUser?.isAdmin
                    || this.currentSessionUser?.is_admin
                    || this.currentSessionUser?.admin
            );
        },

        hasValidThorondorToken() {
            return Boolean(this.thorondorState.token);
        },

        canManageHostUsers() {
            return Boolean(this.selectedAgentId && this.isCurrentUserAdmin && this.hasValidThorondorToken && this.thorondorState.central?.enabled);
        },

        canManageHostServices() {
            return Boolean(this.selectedAgentId && this.isCurrentUserAdmin && this.hasValidThorondorToken && this.thorondorState.central?.enabled);
        },

        canManageSafeActions() {
            return Boolean(this.selectedAgentId && this.isCurrentUserAdmin && this.hasValidThorondorToken);
        },

        safeActionGuardMessage() {
            if (!this.isCurrentUserAdmin) return "Solo usuarios admin pueden ejecutar acciones seguras.";
            if (!this.hasValidThorondorToken) return "Token JWT requerido para auditar acciones.";
            if (!this.thorondorState.central?.enabled) return "Sin API central: sólo se intentará fallback local contra el agente.";
            return "Acciones auditadas con JWT. El agente ejecuta sólo operaciones predefinidas.";
        },

        safeServiceOptions() {
            return this.snapshotServiceInventory
                .filter((service) => service.canManage !== false)
                .slice()
                .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
                .slice(0, 80);
        },

        safeUserOptions() {
            return this.hostUsers.slice(0, 120);
        },

        userManagementRequiresUser() {
            return this.userManagementDraft.type !== "refresh-user-inventory";
        },

        userManagementRequiresGroup() {
            return ["add-user-to-group", "remove-user-from-group"].includes(this.userManagementDraft.type);
        },

        canSubmitUserManagement() {
            if (this.userManagementBusy || !this.canManageHostUsers) return false;
            if (this.userManagementRequiresUser && !this.userManagementDraft.username) return false;
            if (this.userManagementRequiresGroup && !this.userManagementDraft.group) return false;
            return true;
        },

        userManagementActionLabel() {
            const labels = {
                "refresh-user-inventory": "Actualizar inventario",
                "disable-user": "Bloquear usuario",
                "enable-user": "Habilitar usuario",
                "add-user-to-group": "Añadir a grupo",
                "remove-user-from-group": "Quitar de grupo"
            };
            return labels[this.userManagementDraft.type] || "Encolar acción";
        },

        userManagementGuardMessage() {
            if (!this.isCurrentUserAdmin) return "Solo usuarios admin pueden gestionar cuentas del host.";
            if (!this.hasValidThorondorToken) return "Token JWT requerido para encolar acciones.";
            if (!this.thorondorState.central?.enabled) return "API central requerida para auditar y ejecutar acciones.";
            return "Acción auditada: se encola en la API y el agente la ejecuta con permisos locales.";
        },

        serviceManagementGuardMessage() {
            if (!this.isCurrentUserAdmin) return "Solo usuarios admin pueden gestionar servicios del host.";
            if (!this.hasValidThorondorToken) return "Token JWT requerido para encolar acciones.";
            if (!this.thorondorState.central?.enabled) return "API central requerida para auditar y ejecutar acciones.";
            return "Acción auditada: se encola en la API y el agente ejecuta systemctl o PowerShell en el host.";
        },

        userAuditText() {
            const history = this.snapshotLoginHistory.join("\n");
            const events = this.userTimelineEvents
                .map((event) => `[${this.formatDateTime(event.timestamp)}] ${this.humanizeEventKind(event.kind)} · ${event.user || "-"} · ${event.sourceIp || "-"}`)
                .join("\n");
            return [history, events].filter(Boolean).join("\n\n") || "Sin historial ni eventos de usuario disponibles.";
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

        networkInterfaceRows() {
            const ratesByName = this.snapshotNetworkRates.reduce((acc, rate) => {
                acc[rate.name] = rate;
                return acc;
            }, {});
            return (this.selectedLatestSnapshot?.interfaces || []).map((iface) => ({
                ...iface,
                sendBytesPerSec: Number(ratesByName[iface.name]?.sendBytesPerSec) || 0,
                recvBytesPerSec: Number(ratesByName[iface.name]?.recvBytesPerSec) || 0
            }));
        },

        openPortRows() {
            return [...this.snapshotOpenPorts].sort((a, b) =>
                String(a.proto || "").localeCompare(String(b.proto || "")) ||
                (Number(a.port) || 0) - (Number(b.port) || 0) ||
                String(a.ip || "").localeCompare(String(b.ip || ""))
            );
        },

        snapshotEstablished() {
            return this.selectedLatestSnapshot?.establishedConnections || [];
        },

        connectionRows() {
            return [...this.snapshotEstablished].sort((a, b) =>
                String(a.process || "").localeCompare(String(b.process || "")) ||
                (Number(a.pid) || 0) - (Number(b.pid) || 0) ||
                String(a.remoteAddr || "").localeCompare(String(b.remoteAddr || ""))
            );
        },

        networkSummaryCards() {
            const totalTx = this.snapshotNetworkRates.reduce((sum, rate) => sum + (Number(rate.sendBytesPerSec) || 0), 0);
            const totalRx = this.snapshotNetworkRates.reduce((sum, rate) => sum + (Number(rate.recvBytesPerSec) || 0), 0);
            return [
                { label: "Interfaces", value: this.networkInterfaceRows.length, note: "adaptadores detectados" },
                { label: "Puertos abiertos", value: this.openPortRows.length, note: "TCP LISTEN y UDP" },
                { label: "Conexiones", value: this.connectionRows.length, note: "sesiones establecidas" },
                { label: "Tráfico", value: `${this.formatBytes(totalRx)}/s`, note: `RX · TX ${this.formatBytes(totalTx)}/s` }
            ];
        },

        snapshotFailedServices() {
            return this.selectedLatestSnapshot?.failedServices || [];
        },

        snapshotServiceInventory() {
            return this.selectedLatestSnapshot?.serviceInventory || [];
        },

        visibleServiceInventory() {
            return [...this.snapshotServiceInventory]
                .sort((a, b) => {
                    const aProblem = this.isServiceProblem(a) ? 0 : 1;
                    const bProblem = this.isServiceProblem(b) ? 0 : 1;
                    return aProblem - bProblem || String(a.name || "").localeCompare(String(b.name || ""));
                })
                .slice(0, 80);
        },

        snapshotScheduledTasks() {
            return this.selectedLatestSnapshot?.scheduledTasks || [];
        },

        visibleScheduledTasks() {
            return [...this.snapshotScheduledTasks]
                .sort((a, b) => String(a.source || "").localeCompare(String(b.source || "")) || String(a.name || "").localeCompare(String(b.name || "")))
                .slice(0, 80);
        },

        snapshotFirewallRules() {
            return this.selectedLatestSnapshot?.firewallRules || [];
        },

        snapshotFirewallSummary() {
            return this.selectedLatestSnapshot?.firewallSummary || {
                total: this.snapshotFirewallRules.length,
                thorondor: this.thorondorFirewallRules.length,
                system: this.systemFirewallRules.length,
                blockedIps: []
            };
        },

        thorondorFirewallRules() {
            return this.snapshotFirewallRules.filter((rule) => rule.managedByThorondor || rule.scope === "thorondor");
        },

        systemFirewallRules() {
            return this.snapshotFirewallRules.filter((rule) => !(rule.managedByThorondor || rule.scope === "thorondor"));
        },

        visibleFirewallRules() {
            return this.snapshotFirewallRules.slice(0, 80);
        },

        snapshotInventoryChanges() {
            return this.selectedLatestSnapshot?.inventoryChanges || { initialized: true, events: [], counts: {} };
        },

        visibleInventoryChanges() {
            return (this.snapshotInventoryChanges.events || []).slice(0, 80);
        },

        snapshotHostBaseline() {
            return this.selectedLatestSnapshot?.hostBaseline || this.snapshotInventoryChanges;
        },

        importantBaselineChanges() {
            return (this.snapshotHostBaseline.importantEvents || this.snapshotHostBaseline.events || [])
                .filter((event) => event.important || ["danger", "warning"].includes(event.severity))
                .slice(0, 40);
        },

        baselineSummaryText() {
            if (this.snapshotHostBaseline.initialized) {
                return "Baseline inicial creado. Marca el estado como bueno cuando valides el host.";
            }
            if (this.importantBaselineChanges.length) {
                return `${this.importantBaselineChanges.length} cambio(s) importantes pendientes de revisar.`;
            }
            return "El host coincide con el baseline guardado.";
        },

        snapshotSecurityAccess() {
            const summary = this.selectedLatestSnapshot?.securityAccess || {};
            return {
                failedLogins: Number(summary.failedLogins) || this.failedLoginsForSelected.length,
                successfulLogins: Number(summary.successfulLogins) || this.successfulLoginsForSelected.length,
                sudoEvents: Number(summary.sudoEvents) || this.selectedPrivilegedEvents.filter((event) => event.kind === "sudo_command").length,
                blockedIps: Number(summary.blockedIps) || this.thorondorFirewallRules.length,
                repeatedIps: summary.repeatedIps || this.countSecurityValues(this.failedLoginsForSelected, "sourceIp").filter((item) => item.count >= 2),
                attackedUsers: summary.attackedUsers || this.countSecurityValues(this.failedLoginsForSelected, "user"),
                protocols: summary.protocols || this.countSecurityValues(this.failedLoginsForSelected, "protocol"),
                recommendation: summary.recommendation || "Sin patrón de acceso anómalo en la muestra actual.",
                severity: summary.severity || "ok",
                topIp: summary.topIp || null,
                topUser: summary.topUser || null
            };
        },

        accessSummaryCards() {
            const access = this.snapshotSecurityAccess;
            return [
                { label: "Fallidos", value: access.failedLogins, tone: access.failedLogins ? "tone-warning" : "tone-success", note: "Autenticaciones rechazadas" },
                { label: "Correctos", value: access.successfulLogins, tone: "tone-neutral", note: "Accesos aceptados" },
                { label: "IPs repetidas", value: access.repeatedIps.length, tone: access.repeatedIps.length ? "tone-warning" : "tone-success", note: access.topIp ? access.topIp.value : "Sin origen repetido" },
                { label: "Sudo / privilegios", value: access.sudoEvents, tone: access.sudoEvents ? "tone-warning" : "tone-neutral", note: "Eventos privilegiados" },
                { label: "Bloqueos", value: access.blockedIps, tone: access.blockedIps ? "tone-success" : "tone-neutral", note: "Reglas propias Thorondor" }
            ];
        },

        alertsPausedActive() {
            return isThorondorAgentAlertsPaused(this.selectedAgent);
        },

        maintenanceUntilLabel() {
            if (!this.selectedAgent?.alertsPausedUntil) return "Sin ventana activa";
            return this.formatDateTime(this.selectedAgent.alertsPausedUntil);
        },

        snapshotAgentStatus() {
            return this.selectedLatestSnapshot?.agentStatus || {};
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
        this.syncDetailTabFromRoute();
    },

    watch: {
        "$route.query.agent": {
            immediate: true,
            handler() {
                this.syncSelectedAgentFromRoute();
            }
        },
        "$route.query.tab": {
            immediate: true,
            handler() {
                this.syncDetailTabFromRoute();
            }
        },
        selectedAgentId() {
            this.syncHostRouteQuery();
        },
        dashboardCards() {
            this.syncSelectedAgentFromRoute();
            this.syncHostRouteQuery();
        }
    },

    methods: {
        normalizeDetailTab(tabId) {
            const rawTab = Array.isArray(tabId) ? tabId[0] : tabId;
            const normalizedTab = String(rawTab || "overview").trim();
            const aliases = {
                dashboard: "overview",
                home: "overview",
                process: "processes",
                networking: "network",
                user: "users",
                log: "logs"
            };
            const nextTab = aliases[normalizedTab] || normalizedTab;
            return this.detailTabs.some((tab) => tab.id === nextTab) ? nextTab : "overview";
        },

        syncDetailTabFromRoute() {
            this.detailTab = this.normalizeDetailTab(this.$route.query.tab);
            this.syncHostRouteQuery();
        },

        syncHostRouteQuery() {
            if (this.$route.name !== "thorondor-host-detail") return;

            const query = { ...this.$route.query };
            const nextTab = this.normalizeDetailTab(query.tab || this.detailTab);
            const currentAgent = Array.isArray(query.agent) ? query.agent[0] : query.agent;
            const nextAgent = this.selectedAgentId || currentAgent || "";

            if (nextTab) {
                query.tab = nextTab;
            }

            if (nextAgent) {
                query.agent = nextAgent;
            }

            const sameTab = this.$route.query.tab === query.tab;
            const sameAgent = (this.$route.query.agent || "") === (query.agent || "");
            if (sameTab && sameAgent) return;

            this.$router.replace({
                name: "thorondor-host-detail",
                query
            });
        },

        setDetailTab(tabId) {
            const nextTab = this.normalizeDetailTab(tabId);
            this.detailTab = nextTab;

            this.$router.replace({
                name: "thorondor-host-detail",
                query: {
                    ...this.$route.query,
                    agent: this.selectedAgentId || this.$route.query.agent,
                    tab: nextTab
                }
            });
        },

        syncSelectedAgentFromRoute() {
            const routeAgent = Array.isArray(this.$route.query.agent)
                ? this.$route.query.agent[0]
                : this.$route.query.agent;
            if (routeAgent && this.dashboardCards.find((item) => item.id === routeAgent)) {
                this.selectAgent(routeAgent);
                this.syncHostRouteQuery();
                return;
            }

            this.ensureSelectedAgent();
            this.syncHostRouteQuery();
        },

        formatUserStarted(value) {
            const seconds = Number(value);
            if (!Number.isFinite(seconds) || seconds <= 0) return "N/D";
            return this.formatDateTime(new Date(seconds * 1000).toISOString());
        },

        formatUserGroups(groups) {
            const values = Array.isArray(groups) ? groups.filter(Boolean) : [];
            if (!values.length) return "-";
            if (values.length <= 4) return values.join(", ");
            return `${values.slice(0, 4).join(", ")} +${values.length - 4}`;
        },

        countSecurityValues(events, field) {
            const counts = (events || []).reduce((acc, event) => {
                const value = String(event?.[field] || "N/D").trim() || "N/D";
                if (["sin-ip", "win", "local", "-"].includes(value.toLowerCase())) return acc;
                acc[value] = (acc[value] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(counts)
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
                .slice(0, 10);
        },

        async setMaintenanceWindow(enabled) {
            if (!this.selectedAgentId) return;
            this.maintenanceBusy = true;
            this.maintenanceFeedback = { type: "", message: "" };
            try {
                const record = await this.$store.dispatch("setThorondorAgentMaintenance", {
                    agentId: this.selectedAgentId,
                    alertsPaused: enabled,
                    minutes: enabled ? this.maintenanceDraft.minutes : 0,
                    maintenanceReason: enabled ? (this.maintenanceDraft.reason || "Ventana de mantenimiento") : ""
                });
                this.maintenanceFeedback = {
                    type: "success",
                    message: enabled
                        ? `Alertas pausadas hasta ${this.formatDateTime(record.alertsPausedUntil)}.`
                        : "Alertas reanudadas."
                };
            } catch (error) {
                this.maintenanceFeedback = {
                    type: "error",
                    message: error.message || "No se pudo actualizar el modo mantenimiento."
                };
            } finally {
                this.maintenanceBusy = false;
            }
        },

        safeActionLabel(type) {
            return {
                "block-ip": "Bloquear IP",
                "unblock-ip": "Desbloquear IP",
                "restart-service": "Reiniciar servicio",
                "collect-logs": "Recoger logs",
                "list-connected-users": "Listar usuarios",
                "terminate-user-session": "Cerrar sesión",
                "check-host-health": "Comprobar salud",
                "set-host-baseline": "Guardar baseline"
            }[type] || "Acción";
        },

        async queueSafeAction(type, overrides = {}) {
            if (!this.canManageSafeActions) {
                this.safeActionFeedback = { type: "error", message: this.safeActionGuardMessage };
                return;
            }

            const payload = {
                agentId: this.selectedAgentId,
                type,
                ip: overrides.ip ?? this.safeActionDraft.ip,
                serviceName: overrides.serviceName ?? this.safeActionDraft.serviceName,
                username: overrides.username ?? this.safeActionDraft.username,
                sessionId: overrides.sessionId ?? this.safeActionDraft.sessionId,
                reason: overrides.reason ?? this.safeActionDraft.reason ?? "Acción segura desde Thorondor"
            };

            if (["block-ip", "unblock-ip"].includes(type) && !payload.ip) {
                this.safeActionFeedback = { type: "error", message: "Indica una IP." };
                return;
            }
            if (type === "restart-service" && !payload.serviceName) {
                this.safeActionFeedback = { type: "error", message: "Selecciona un servicio." };
                return;
            }
            if (type === "terminate-user-session" && !payload.username) {
                this.safeActionFeedback = { type: "error", message: "Selecciona un usuario conectado." };
                return;
            }
            if (type === "terminate-user-session" && !payload.sessionId) {
                const session = this.connectedUsersForSelected.find((user) => user.name === payload.username);
                payload.sessionId = session?.sessionId || "";
            }

            this.safeActionBusy = type;
            this.safeActionFeedback = { type: "", message: "" };
            try {
                const response = await this.$store.dispatch("executeThorondorSafeAction", payload);
                this.safeActionFeedback = {
                    type: "success",
                    message: response?.message || `${this.safeActionLabel(type)} encolada correctamente.`
                };
            } catch (error) {
                this.safeActionFeedback = {
                    type: "error",
                    message: error.message || `No se pudo ejecutar ${this.safeActionLabel(type).toLowerCase()}.`
                };
            } finally {
                this.safeActionBusy = "";
            }
        },

        primeGroupAction(user) {
            this.userManagementDraft = {
                ...this.userManagementDraft,
                type: "add-user-to-group",
                username: user?.name || "",
                group: "",
                reason: this.userManagementDraft.reason
            };
            this.userManagementFeedback = { type: "", message: "" };
        },

        async queueUserQuickCommand(type, user) {
            this.userManagementDraft = {
                ...this.userManagementDraft,
                type,
                username: user?.name || "",
                group: "",
                reason: this.userManagementDraft.reason || "Acción rápida desde la vista de usuarios"
            };
            await this.queueUserManagementCommand(type);
        },

        async queueUserManagementCommand(forcedType = "") {
            const type = forcedType || this.userManagementDraft.type;
            const payload = {
                agentId: this.selectedAgentId,
                type,
                username: type === "refresh-user-inventory" ? "" : this.userManagementDraft.username,
                group: ["add-user-to-group", "remove-user-from-group"].includes(type) ? this.userManagementDraft.group : "",
                reason: this.userManagementDraft.reason || "Gestión de usuarios desde Thorondor"
            };

            if (!this.canManageHostUsers) {
                this.userManagementFeedback = { type: "error", message: this.userManagementGuardMessage };
                return;
            }

            if (type !== "refresh-user-inventory" && !payload.username) {
                this.userManagementFeedback = { type: "error", message: "Selecciona un usuario." };
                return;
            }

            if (["add-user-to-group", "remove-user-from-group"].includes(type) && !payload.group) {
                this.userManagementFeedback = { type: "error", message: "Selecciona un grupo." };
                return;
            }

            this.userManagementBusy = true;
            this.userManagementFeedback = { type: "", message: "" };
            try {
                const response = await this.$store.dispatch("manageThorondorUserAccount", payload);
                this.userManagementFeedback = {
                    type: "success",
                    message: response?.message || "Comando encolado correctamente."
                };
            } catch (error) {
                this.userManagementFeedback = {
                    type: "error",
                    message: error.message || "No se pudo encolar el comando."
                };
            } finally {
                this.userManagementBusy = false;
            }
        },

        isServiceProblem(service) {
            const active = String(service?.activeState || "").toLowerCase();
            const startup = String(service?.startup || "").toLowerCase();
            return active === "failed" || active === "stopped" && ["auto", "automatic", "enabled"].includes(startup);
        },

        serviceStateClass(service) {
            const active = String(service?.activeState || "").toLowerCase();
            if (active === "running" || active === "active") return "state-chip--ok";
            if (active === "failed") return "state-chip--danger";
            return "state-chip--warn";
        },

        serviceActionLabel(type) {
            return {
                "refresh-service-inventory": "Actualizar servicios",
                "start-service": "Arrancar",
                "stop-service": "Parar",
                "restart-service": "Reiniciar"
            }[type] || "Servicio";
        },

        async queueServiceCommand(type, service = null) {
            if (!this.canManageHostServices) {
                this.serviceManagementFeedback = { type: "error", message: this.serviceManagementGuardMessage };
                return;
            }

            const serviceName = service?.name || "";
            if (type !== "refresh-service-inventory" && !serviceName) {
                this.serviceManagementFeedback = { type: "error", message: "Servicio requerido." };
                return;
            }

            const busyKey = `${type}:${serviceName || "inventory"}`;
            this.serviceManagementBusy = busyKey;
            this.serviceManagementFeedback = { type: "", message: "" };

            try {
                const response = await this.$store.dispatch("manageThorondorService", {
                    agentId: this.selectedAgentId,
                    type,
                    serviceName,
                    reason: "Gestión de servicios desde Thorondor"
                });
                this.serviceManagementFeedback = {
                    type: "success",
                    message: response?.message || "Comando de servicio encolado correctamente."
                };
            } catch (error) {
                this.serviceManagementFeedback = {
                    type: "error",
                    message: error.message || "No se pudo encolar el comando de servicio."
                };
            } finally {
                this.serviceManagementBusy = "";
            }
        },

        serviceActionBusy(type, service = null) {
            return this.serviceManagementBusy === `${type}:${service?.name || "inventory"}`;
        },

        formatInventoryChange(change) {
            const action = {
                added: "Alta",
                removed: "Baja",
                changed: "Cambio"
            }[change?.action] || change?.action || "Cambio";
            return `${action} · ${change?.label || change?.kind || "Inventario"} · ${change?.key || "-"}`;
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

        barWidth(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) return "0%";
            return `${Math.min(Math.max(number, 0), 100)}%`;
        },

        usageTone(value) {
            const number = Number(value);
            if (!Number.isFinite(number)) return "tone-neutral";
            if (number >= 90) return "tone-danger";
            if (number >= 75) return "tone-warning";
            return "tone-success";
        },

        formatMhz(current, max) {
            const currentValue = Number(current) || 0;
            const maxValue = Number(max) || 0;
            if (!currentValue && !maxValue) return "N/D";
            if (currentValue && maxValue && currentValue !== maxValue) {
                return `${currentValue} / ${maxValue} MHz`;
            }
            return `${currentValue || maxValue} MHz`;
        },

        formatGpuUsage(gpu) {
            const value = Number(gpu?.utilPercent);
            return Number.isFinite(value) ? this.formatPercent(value) : "N/D";
        },

        formatGpuMemory(gpu) {
            const totalMb = Number(gpu?.vramMb) || (Number(gpu?.vramBytes) ? Number(gpu.vramBytes) / 1024 ** 2 : 0);
            const usedMb = Number(gpu?.vramUsedMb) || 0;
            const percent = Number(gpu?.vramPercent);
            if (totalMb && usedMb) {
                return `${Math.round(usedMb)} / ${Math.round(totalMb)} MB`;
            }
            if (totalMb && Number.isFinite(percent) && percent > 0) {
                return `${Math.round(totalMb)} MB · ${this.formatPercent(percent)}`;
            }
            if (totalMb) return `${Math.round(totalMb)} MB`;
            return "N/D";
        },

        formatGpuTemperature(gpu) {
            const value = Number(gpu?.tempC);
            return Number.isFinite(value) && value > 0 ? `${value.toFixed(1)}°C` : "N/D";
        },

        formatProcessStarted(value) {
            if (!value) return "N/D";
            const timestamp = new Date(value).getTime();
            if (!Number.isFinite(timestamp)) return "N/D";
            return this.formatDateTime(value);
        },

        processStatusClass(status) {
            const normalized = String(status || "").toLowerCase();
            if (["running", "runnable"].includes(normalized)) return "state-chip--ok";
            if (["stopped", "zombie", "dead"].includes(normalized)) return "state-chip--danger";
            return "state-chip--neutral";
        },

        protocolBadgeClass(proto) {
            return String(proto || "").toLowerCase() === "udp" ? "protocol-badge--udp" : "protocol-badge--tcp";
        },

        processCpuWidth(process) {
            return this.barWidth(process?.cpuPercent);
        },

        processMemoryWidth(process) {
            return this.barWidth(process?.memoryPercent);
        },

        tempColorClass(celsius) {
            if (celsius == null) return "tone-neutral";
            if (celsius >= 90) return "tone-danger";
            if (celsius >= 75) return "tone-warning";
            return "tone-success";
        },

        temperatureWidth(celsius) {
            const value = Number(celsius);
            if (!Number.isFinite(value)) return "0%";
            return `${Math.min(Math.max(value, 0), 120) / 120 * 100}%`;
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

.process-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
}

.process-summary-card {
    display: grid;
    gap: 0.28rem;
    min-height: 86px;
    padding: 0.8rem 0.9rem;
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.process-summary-card label {
    margin: 0;
    color: #aeb8c4;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
}

.process-summary-card strong {
    color: #f5f7fa;
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1;
}

.process-summary-card small {
    color: rgba(190, 203, 218, 0.76);
    font-size: 0.74rem;
    line-height: 1.35;
}

.process-toolbar {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(180px, 240px);
    gap: 0.8rem;
    margin-bottom: 0.85rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid rgba(176, 184, 194, 0.14);
}

.process-table-wrap {
    max-height: 620px;
}

.process-name-cell {
    min-width: 220px;
}

.process-name-cell strong {
    display: block;
    color: #f4f7fa;
    font-size: 0.82rem;
}

.resource-meter-cell {
    display: grid;
    grid-template-columns: minmax(72px, 1fr) 48px;
    align-items: center;
    gap: 0.45rem;
    min-width: 138px;
}

.resource-meter-cell span {
    color: #cfd6de;
    font-size: 0.76rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
}

.protocol-badge {
    display: inline-flex;
    min-width: 42px;
    justify-content: center;
    padding: 0.12rem 0.42rem;
    border: 1px solid rgba(176, 184, 194, 0.18);
    border-radius: 3px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
}

.protocol-badge--tcp {
    border-color: rgba(143, 214, 173, 0.28);
    color: #c6f6d8;
    background: rgba(33, 118, 80, 0.12);
}

.protocol-badge--udp {
    border-color: rgba(52, 211, 153, 0.28);
    color: #bbf7d0;
    background: rgba(22, 163, 74, 0.12);
}

.hardware-usage-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.75rem;
}

.hardware-usage-card {
    display: grid;
    align-content: space-between;
    min-height: 116px;
    padding: 0.85rem;
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.hardware-usage-card label {
    display: block;
    margin-bottom: 0.35rem;
    color: #aeb8c4;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.hardware-usage-card strong {
    display: block;
    color: #f5f7fa;
    font-size: 1.55rem;
    line-height: 1.05;
}

.hardware-usage-card small {
    display: block;
    margin-top: 0.35rem;
    overflow: hidden;
    color: rgba(190, 203, 218, 0.76);
    font-size: 0.76rem;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.hardware-meter {
    width: 100%;
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(176, 184, 194, 0.14);
}

.hardware-meter-fill {
    height: 100%;
    border-radius: inherit;
    background: rgba(74, 222, 128, 0.82);
    transition: width 0.25s ease;
}

.hardware-meter-fill.tone-neutral {
    background: rgba(156, 163, 175, 0.72);
}

.hardware-meter-fill.tone-success {
    background: rgba(74, 222, 128, 0.84);
}

.hardware-meter-fill.tone-warning {
    background: rgba(251, 191, 36, 0.86);
}

.hardware-meter-fill.tone-danger {
    background: rgba(239, 68, 68, 0.9);
}

.hardware-main-reading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
}

.hardware-main-reading strong {
    color: #f5f7fa;
    font-size: 1.7rem;
    line-height: 1;
}

.hardware-main-reading span {
    color: rgba(190, 203, 218, 0.78);
    font-size: 0.82rem;
    text-align: right;
}

.cpu-core-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem 0.8rem;
}

.cpu-core-row {
    display: grid;
    grid-template-columns: 4.2rem minmax(0, 1fr) 3.2rem;
    align-items: center;
    gap: 0.55rem;
    padding: 0.35rem 0;
    color: rgba(220, 230, 241, 0.84);
    font-size: 0.78rem;
}

.cpu-core-row strong {
    color: #f5f7fa;
    font-size: 0.76rem;
    text-align: right;
}

.hardware-stack {
    display: grid;
    gap: 0.65rem;
}

.hardware-row {
    display: grid;
    gap: 0.25rem;
    padding: 0.72rem 0.82rem;
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
}

.hardware-row strong {
    color: #f5f7fa;
    font-size: 0.86rem;
    line-height: 1.25;
}

.hardware-row span {
    color: rgba(220, 230, 241, 0.82);
    font-size: 0.8rem;
}

.hardware-row small {
    color: rgba(174, 184, 196, 0.74);
    font-size: 0.72rem;
    line-height: 1.35;
}

.hardware-row--rich {
    gap: 0.45rem;
}

.hardware-row-title,
.hardware-row-metrics {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.hardware-row-metrics {
    justify-content: flex-start;
    flex-wrap: wrap;
}

.hardware-row-metrics span {
    font-size: 0.74rem;
}

.hardware-physical-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.6rem;
    margin-top: 0.85rem;
}

.hardware-physical-row {
    display: grid;
    gap: 0.2rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid rgba(176, 184, 194, 0.14);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
}

.hardware-physical-row strong {
    color: #f5f7fa;
    font-size: 0.82rem;
}

.hardware-physical-row span,
.hardware-physical-row small {
    color: rgba(190, 203, 218, 0.76);
    font-size: 0.72rem;
    line-height: 1.35;
}

.user-management-card {
    border-color: rgba(236, 194, 119, 0.22);
}

.user-management-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
}

.management-guard-note {
    display: block;
    margin-top: 0.65rem;
    color: rgba(190, 203, 218, 0.78);
    font-size: 0.76rem;
    line-height: 1.45;
}

.operation-feedback {
    margin: 0.85rem 0 0;
    padding: 0.65rem 0.75rem;
    border: 1px solid rgba(176, 184, 194, 0.18);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    font-size: 0.8rem;
    line-height: 1.45;
}

.operation-feedback--success {
    border-color: rgba(74, 222, 128, 0.26);
    color: #bbf7d0;
}

.operation-feedback--error {
    border-color: rgba(248, 113, 113, 0.28);
    color: #fecaca;
}

.management-feedback {
    margin: 0 0 0.75rem;
    padding: 0.58rem 0.7rem;
    border: 1px solid rgba(176, 184, 194, 0.18);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
    color: rgba(213, 225, 238, 0.86);
    font-size: 0.8rem;
    line-height: 1.45;
}

.management-feedback.is-success {
    border-color: rgba(74, 222, 128, 0.26);
    color: #bbf7d0;
}

.management-feedback.is-error {
    border-color: rgba(248, 113, 113, 0.28);
    color: #fecaca;
}

.action-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.safe-action-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
}

.maintenance-grid {
    grid-template-columns: 130px minmax(0, 1fr);
}

.plain-note {
    margin: 0;
    color: rgba(220, 230, 241, 0.86);
    font-size: 0.9rem;
    line-height: 1.55;
}

.compact-scroll {
    max-height: 260px;
    overflow: auto;
}

.table-subtext {
    display: block;
    max-width: 18rem;
    margin-top: 0.18rem;
    overflow: hidden;
    color: rgba(174, 184, 196, 0.74);
    font-size: 0.72rem;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.groups-cell {
    max-width: 18rem;
    overflow: hidden;
    color: rgba(213, 225, 238, 0.82);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-table-actions {
    flex-wrap: nowrap;
}

.host-group-list {
    display: grid;
    gap: 0.55rem;
    max-height: 420px;
}

.host-group-row {
    display: grid;
    gap: 0.2rem;
    padding: 0.62rem 0.72rem;
    border: 1px solid rgba(176, 184, 194, 0.16);
    border-radius: 4px;
    background: var(--thorondor-soft-background);
}

.host-group-row strong {
    color: #f5f7fa;
    font-size: 0.82rem;
}

.host-group-row span,
.host-group-row small {
    color: rgba(190, 203, 218, 0.76);
    font-size: 0.72rem;
    line-height: 1.35;
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

.state-chip--neutral {
    background: rgba(148, 163, 184, 0.14);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.22);
}

.state-chip--warn {
    background: rgba(234, 179, 8, 0.14);
    color: #facc15;
    border: 1px solid rgba(234, 179, 8, 0.24);
}

.state-chip--danger {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
}

.host-screen-preview {
    display: grid;
    gap: 1rem;
}

.host-preview-control-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
    padding: 1rem;
    border: 1px solid rgba(205, 213, 210, 0.14);
    border-radius: 4px;
    background: var(--thorondor-flat-soft-background, var(--thorondor-soft-background));
}

.host-preview-control-grid--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.host-overview-preview-list,
.host-network-preview-layout dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
}

.host-overview-preview-list div,
.host-network-preview-layout dl div {
    display: grid;
    gap: 0.35rem;
    min-height: 104px;
    padding: 0.9rem;
    border: 1px solid rgba(205, 213, 210, 0.14);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.host-overview-preview-list dt,
.host-network-preview-layout dt,
.host-hardware-preview-list strong {
    color: #f0bc6a;
    font-size: 0.74rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.host-overview-preview-list dd,
.host-network-preview-layout dd,
.host-hardware-preview-list span {
    margin: 0;
    color: rgba(220, 230, 241, 0.86);
    font-size: 0.88rem;
    line-height: 1.45;
}

.host-preview-table {
    overflow: auto;
    border: 1px solid rgba(205, 213, 210, 0.14);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

.host-preview-table table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
}

.host-preview-table th,
.host-preview-table td {
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid rgba(205, 213, 210, 0.12);
    vertical-align: top;
}

.host-preview-table th {
    color: #b7c9bd;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.host-preview-table td {
    color: rgba(220, 230, 241, 0.86);
    font-size: 0.86rem;
    line-height: 1.45;
}

.host-preview-table tr:last-child td {
    border-bottom: none;
}

.host-preview-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    color: rgba(220, 230, 241, 0.78);
    font-size: 0.84rem;
}

.host-hardware-preview-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.host-hardware-preview-list li {
    display: grid;
    gap: 0.35rem;
    min-height: 112px;
    padding: 0.9rem;
    border: 1px solid rgba(205, 213, 210, 0.14);
    border-radius: 4px;
    background: var(--thorondor-nested-background);
}

@media (max-width: 1200px) {
    .process-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hardware-usage-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .host-preview-control-grid--three,
    .host-hardware-preview-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {
    .process-summary-grid,
    .process-toolbar {
        grid-template-columns: 1fr;
    }

    .hardware-usage-grid,
    .cpu-core-grid,
    .safe-action-grid,
    .maintenance-grid,
    .host-preview-control-grid,
    .host-preview-control-grid--three,
    .host-overview-preview-list,
    .host-network-preview-layout dl,
    .host-hardware-preview-list {
        grid-template-columns: 1fr;
    }

    .hardware-main-reading,
    .hardware-row-title {
        align-items: flex-start;
        flex-direction: column;
    }

    .hardware-main-reading span {
        text-align: left;
    }
}
</style>
