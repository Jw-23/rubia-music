import { ref } from 'vue'

export type AppView = 'home' | 'search' | 'favorites' | 'playlists' | 'recent'
export const activeView = ref<AppView>('search')
export const navigateTo = (view: AppView) => { activeView.value = view }
