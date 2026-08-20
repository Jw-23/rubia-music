import { ref, watch } from 'vue'

export type AppView = 'home' | 'search' | 'favorites' | 'playlists' | 'recent'
const storageKey = 'rubia.music.navigation.v1'
const savedView = localStorage.getItem(storageKey) as AppView | null
const validViews: AppView[] = ['home', 'search', 'favorites', 'playlists', 'recent']
export const activeView = ref<AppView>(savedView && validViews.includes(savedView) ? savedView : 'home')
watch(activeView, view => localStorage.setItem(storageKey, view))
export const navigateTo = (view: AppView) => { activeView.value = view }
