<template>
    <div class="chart-shell" :style="chartStyle">
        <canvas ref="canvas"></canvas>
        <div v-if="showFallback" class="chart-fallback">
            Chart.js no está disponible en este navegador. La tabla de métricas sigue operativa.
        </div>
    </div>
</template>

<script>
export default {
    name: "ThorondorLineChart",

    props: {
        chartId: {
            type: String,
            required: true
        },
        labels: {
            type: Array,
            default: () => []
        },
        datasets: {
            type: Array,
            default: () => []
        },
        title: {
            type: String,
            default: ""
        },
        type: {
            type: String,
            default: "line"
        },
        height: {
            type: [Number, String],
            default: 320
        },
        stacked: {
            type: Boolean,
            default: false
        },
        beginAtZero: {
            type: Boolean,
            default: true
        }
    },

    data() {
        return {
            chart: null,
            showFallback: false,
            isDestroyed: false
        };
    },

    computed: {
        chartData() {
            return { labels: this.labels, datasets: this.datasets };
        },

        chartStyle() {
            const height = Number(this.height);
            return {
                "--chart-height": Number.isFinite(height) ? `${height}px` : String(this.height)
            };
        }
    },

    mounted() {
        this.$nextTick(() => {
            this.renderChart();
        });
    },

    beforeUnmount() {
        this.isDestroyed = true;
        this.destroyChart();
    },

    watch: {
        chartData: {
            deep: true,
            handler() {
                this.$nextTick(() => {
                    this.renderChart();
                });
            }
        }
    },

    methods: {
        destroyChart() {
            if (this.chart) {
                try { this.chart.destroy(); } catch {}
                this.chart = null;
            }
        },

        renderChart() {
            if (this.isDestroyed) return;

            const ChartLib = typeof window !== "undefined" ? window.Chart : null;
            if (!ChartLib || !this.$refs.canvas) {
                this.showFallback = true;
                return;
            }

            const canvas = this.$refs.canvas;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                this.showFallback = true;
                return;
            }

            this.destroyChart();

            if (typeof ChartLib.getChart === "function") {
                const orphaned = ChartLib.getChart(canvas);
                if (orphaned) {
                    try { orphaned.destroy(); } catch {}
                }
            }

            if (this.isDestroyed) return;

            this.showFallback = false;

            try {
                const hasCartesianScales = !["doughnut", "pie", "polarArea"].includes(this.type);
                this.chart = new ChartLib(canvas, {
                    type: this.type,
                    data: {
                        labels: this.labels,
                        datasets: this.datasets
                    },
                    options: {
                        animation: false,
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: "index",
                            intersect: false
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    color: "#cfd6de"
                                }
                            },
                            title: {
                                display: !!this.title,
                                text: this.title,
                                color: "#f8fafc"
                            }
                        },
                        scales: hasCartesianScales ? {
                            x: {
                                stacked: this.stacked,
                                ticks: {
                                    color: "#9aa6b3"
                                },
                                grid: {
                                    color: "rgba(176, 184, 194, 0.16)"
                                }
                            },
                            y: {
                                beginAtZero: this.beginAtZero,
                                stacked: this.stacked,
                                ticks: {
                                    color: "#9aa6b3"
                                },
                                grid: {
                                    color: "rgba(176, 184, 194, 0.16)"
                                }
                            }
                        } : {}
                    }
                });
            } catch {
                this.showFallback = true;
            }
        }
    }
};
</script>

<style scoped>
.chart-shell {
    position: relative;
    min-height: var(--chart-height, 320px);
}

.chart-shell canvas {
    width: 100% !important;
    height: var(--chart-height, 320px) !important;
}

.chart-fallback {
    display: grid;
    place-items: center;
    min-height: var(--chart-height, 320px);
    color: #9aa6b3;
    font-size: 0.95rem;
    text-align: center;
}
</style>
