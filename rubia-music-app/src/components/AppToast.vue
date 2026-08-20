<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { toastMessage } from '../features/notifications/toastState'
</script>

<template>
  <Transition name="toast">
    <div v-if="toastMessage" class="app-toast" role="status" aria-live="polite"><AppIcon name="check" :size="16"/><span>{{ toastMessage }}</span></div>
  </Transition>
</template>
