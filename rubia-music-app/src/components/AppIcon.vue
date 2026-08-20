<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
</script>

<template>
  <svg class="app-icon" :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'search'"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></template>
    <template v-else-if="name === 'home'"><path d="m3.5 10 8.5-7 8.5 7"/><path d="M5.5 9v11h13V9M9.5 20v-6h5v6"/></template>
    <template v-else-if="name === 'heart'"><path d="M20.6 5.8c-2.1-2.2-5.6-1.8-7.4.5L12 7.8l-1.2-1.5C9 4 5.5 3.6 3.4 5.8 1.3 8 1.5 11.5 3.8 13.7L12 21l8.2-7.3c2.3-2.2 2.5-5.7.4-7.9Z"/></template>
    <template v-else-if="name === 'playlist'"><path d="M4 6h10M4 11h10M4 16h7"/><path d="M17 10v8.5a2.5 2.5 0 1 1-2-2.45"/><path d="m17 10 4-1v3"/></template>
    <template v-else-if="name === 'history'"><path d="M4.6 7.5A8.5 8.5 0 1 1 3.5 14"/><path d="M4 3.5v4.7h4.7M12 7.5V12l3 2"/></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></template>
    <template v-else-if="name === 'music'"><path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14"/></template>
    <template v-else-if="name === 'minus'"><path d="M5 12h14"/></template>
    <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14M10 11v6M14 11v6"/></template>
    <template v-else-if="name === 'close'"><path d="m6 6 12 12M18 6 6 18"/></template>
    <template v-else-if="name === 'check'"><path d="m5 12 4 4L19 6"/></template>
    <template v-else-if="name === 'play'"><path d="m8.5 6.5 9 5.5-9 5.5Z" fill="currentColor" stroke="none"/></template>
    <template v-else-if="name === 'pause'"><path d="M9 7v10M15 7v10"/></template>
    <template v-else-if="name === 'lyrics'"><path d="M5 6h14M5 10h10M5 14h12M5 18h7"/></template>
    <template v-else-if="name === 'source'"><path d="M8 7a5 5 0 0 1 8 0M6 4a8 8 0 0 1 12 0"/><circle cx="12" cy="11" r="2"/><path d="M12 13v7"/></template>
    <template v-else-if="name === 'database'"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></template>
    <template v-else-if="name === 'download'"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></template>
  </svg>
</template>
