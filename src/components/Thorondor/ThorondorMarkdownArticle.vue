<template>
    <article class="markdown-article" v-html="html"></article>
</template>

<script>
import { renderMarkdown } from "@/features/thorondor/utils/markdown";

export default {
    name: "ThorondorMarkdownArticle",

    props: {
        source: {
            type: String,
            required: true
        }
    },

    computed: {
        html() {
            return renderMarkdown(this.source);
        }
    }
};
</script>

<style scoped>
.markdown-article {
    color: #dbe5f1;
    line-height: 1.75;
}

.markdown-article :deep(h1),
.markdown-article :deep(h2),
.markdown-article :deep(h3) {
    color: #f8fafc;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}

.markdown-article :deep(h1) {
    font-size: 1.8rem;
}

.markdown-article :deep(h2) {
    font-size: 1.35rem;
}

.markdown-article :deep(h3) {
    font-size: 1.08rem;
}

.markdown-article :deep(p),
.markdown-article :deep(li),
.markdown-article :deep(blockquote) {
    color: #cfd6de;
}

.markdown-article :deep(code) {
    background: var(--thorondor-nested-background);
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    color: #e4e9ef;
    padding: 2px 6px;
    font-family: "Courier New", monospace;
}

.markdown-article :deep(pre) {
    background: var(--thorondor-soft-background);
    border: 1px solid rgba(176, 184, 194, 0.22);
    border-radius: 4px;
    padding: 14px;
    overflow: auto;
}

.markdown-article :deep(pre code) {
    background: transparent;
    border: 0;
    padding: 0;
}

.markdown-article :deep(blockquote) {
    border-left: 3px solid rgba(176, 184, 194, 0.48);
    padding-left: 14px;
    margin-left: 0;
}

.markdown-article :deep(ul),
.markdown-article :deep(ol) {
    padding-left: 20px;
}
</style>
