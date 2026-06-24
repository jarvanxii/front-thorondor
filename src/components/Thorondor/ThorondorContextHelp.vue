<template>
    <span ref="root" class="context-help" @mouseenter="openFromHover" @mouseleave="scheduleClose">
        <button
            ref="trigger"
            type="button"
            class="help-trigger"
            :class="{ 'is-open': isOpen }"
            :aria-label="ariaLabel"
            aria-haspopup="dialog"
            :aria-expanded="String(isOpen)"
            @click.stop="togglePinned"
            @focus="openFromHover"
            @blur="scheduleClose"
        >
            ?
        </button>

        <Teleport to="body">
            <div
                v-if="isOpen"
                ref="popover"
                class="thorondor-help-popover"
                :class="`is-${placement}`"
                :style="popoverStyle"
                role="tooltip"
                @click.stop
                @mouseenter="cancelClose"
                @mouseleave="scheduleClose"
            >
                <span class="thorondor-help-popover-arrow" :style="arrowStyle"></span>
                <strong>{{ title }}</strong>
                <span>{{ copy }}</span>
            </div>
        </Teleport>
    </span>
</template>

<script>
const VIEWPORT_GAP = 16;
const TRIGGER_GAP = 10;

export default {
    name: "ThorondorContextHelp",

    props: {
        title: {
            type: String,
            required: true
        },
        copy: {
            type: String,
            required: true
        },
        ariaLabel: {
            type: String,
            default: "Ayuda contextual"
        },
        maxWidth: {
            type: Number,
            default: 320
        }
    },

    data() {
        return {
            isOpen: false,
            isPinned: false,
            placement: "bottom",
            popoverStyle: {},
            arrowStyle: {},
            closeTimer: null
        };
    },

    beforeUnmount() {
        this.removeFloatingListeners();
        this.cancelClose();
    },

    methods: {
        openFromHover() {
            if (this.isPinned) return;
            this.openPopover(false);
        },

        togglePinned() {
            if (this.isOpen && this.isPinned) {
                this.closePopover();
                return;
            }
            this.openPopover(true);
        },

        openPopover(pinned) {
            this.cancelClose();
            this.isPinned = Boolean(pinned);
            this.isOpen = true;
            this.$nextTick(() => {
                this.updatePosition();
                this.addFloatingListeners();
            });
        },

        scheduleClose() {
            if (this.isPinned) return;
            this.cancelClose();
            this.closeTimer = window.setTimeout(() => this.closePopover(), 120);
        },

        cancelClose() {
            if (this.closeTimer) {
                window.clearTimeout(this.closeTimer);
                this.closeTimer = null;
            }
        },

        closePopover() {
            this.cancelClose();
            this.isOpen = false;
            this.isPinned = false;
            this.removeFloatingListeners();
        },

        updatePosition() {
            const trigger = this.$refs.trigger;
            if (!trigger || typeof window === "undefined") return;

            const triggerRect = trigger.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const width = Math.min(this.maxWidth, Math.max(220, viewportWidth - VIEWPORT_GAP * 2));
            let left = triggerRect.right - width;
            left = Math.max(VIEWPORT_GAP, Math.min(left, viewportWidth - width - VIEWPORT_GAP));

            let top = triggerRect.bottom + TRIGGER_GAP;
            let placement = "bottom";

            const popoverHeight = this.$refs.popover?.offsetHeight || 0;
            if (popoverHeight && top + popoverHeight > viewportHeight - VIEWPORT_GAP) {
                const aboveTop = triggerRect.top - popoverHeight - TRIGGER_GAP;
                if (aboveTop >= VIEWPORT_GAP) {
                    top = aboveTop;
                    placement = "top";
                } else {
                    top = Math.max(VIEWPORT_GAP, viewportHeight - popoverHeight - VIEWPORT_GAP);
                }
            }

            const triggerCenter = triggerRect.left + triggerRect.width / 2;
            const arrowLeft = Math.max(12, Math.min(triggerCenter - left - 7, width - 26));

            this.placement = placement;
            this.popoverStyle = {
                left: `${Math.round(left)}px`,
                top: `${Math.round(top)}px`,
                width: `${Math.round(width)}px`
            };
            this.arrowStyle = {
                left: `${Math.round(arrowLeft)}px`
            };
        },

        handleDocumentClick(event) {
            const root = this.$refs.root;
            const popover = this.$refs.popover;
            if (root?.contains(event.target) || popover?.contains(event.target)) return;
            this.closePopover();
        },

        addFloatingListeners() {
            document.addEventListener("click", this.handleDocumentClick);
            window.addEventListener("resize", this.updatePosition);
            window.addEventListener("scroll", this.updatePosition, true);
        },

        removeFloatingListeners() {
            document.removeEventListener("click", this.handleDocumentClick);
            window.removeEventListener("resize", this.updatePosition);
            window.removeEventListener("scroll", this.updatePosition, true);
        }
    }
};
</script>

<style scoped>
.context-help {
    display: inline-flex;
    flex: 0 0 auto;
    margin-top: 0;
}

.help-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.08rem;
    height: 1.08rem;
    border: 1px solid rgba(176, 184, 194, 0.34);
    border-radius: 4px;
    background: var(--thorondor-flat-background);
    box-shadow: none;
    color: #dbe5ef;
    cursor: var(--cursor-pointer), pointer;
    font-size: 0.58rem;
    font-weight: 800;
    line-height: 1;
    transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.help-trigger:hover,
.help-trigger:focus-visible,
.help-trigger.is-open {
    border-color: rgba(236, 194, 119, 0.48);
    background: var(--thorondor-flat-soft-background);
    color: #ffffff;
    box-shadow: 0 0 0 3px rgba(218, 166, 92, 0.12);
    outline: 0;
}

.thorondor-help-popover {
    position: fixed;
    z-index: 2147483000;
    padding: 0.95rem 1rem;
    border: 1px solid rgba(176, 184, 194, 0.38);
    border-radius: 5px;
    background: linear-gradient(145deg, rgba(30, 39, 39, 0.98), rgba(16, 22, 24, 0.98));
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
    color: rgba(225, 234, 244, 0.96);
    font-size: 0.84rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
    pointer-events: auto;
    text-align: left;
}

.thorondor-help-popover strong {
    display: block;
    margin-bottom: 0.38rem;
    color: #f8fbff;
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1.25;
    text-transform: uppercase;
}

.thorondor-help-popover-arrow {
    position: absolute;
    width: 14px;
    height: 14px;
    border-top: 1px solid rgba(176, 184, 194, 0.38);
    border-left: 1px solid rgba(176, 184, 194, 0.38);
    background: rgba(27, 35, 36, 0.98);
    transform: rotate(45deg);
}

.thorondor-help-popover.is-bottom .thorondor-help-popover-arrow {
    top: -7px;
}

.thorondor-help-popover.is-top .thorondor-help-popover-arrow {
    bottom: -7px;
    transform: rotate(225deg);
}

@media (max-width: 540px) {
    .thorondor-help-popover {
        font-size: 0.8rem;
        line-height: 1.55;
    }
}
</style>
