import { ref } from 'vue'

export const toastMessage = ref('')
let timer = 0
export function showToast(message: string, duration = 2400) {
  toastMessage.value = message
  window.clearTimeout(timer)
  timer = window.setTimeout(() => { toastMessage.value = '' }, duration)
}
