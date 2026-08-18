import { ref } from 'vue'
export const sourceSettingsOpen = ref(false)
export const openSourceSettings = () => { sourceSettingsOpen.value = true }
