import { ref, watch } from 'vue'

export type AppView = 'home' | 'search' | 'favorites' | 'playlists' | 'recent' | 'downloads'
const storageKey = 'rubia.music.navigation.v1'
const primaryViewKey = 'rubia.music.primary-view.v1'
const savedView = localStorage.getItem(storageKey) as AppView | null
const validViews: AppView[] = ['home', 'search', 'favorites', 'playlists', 'recent', 'downloads']
export const activeView = ref<AppView>(savedView && validViews.includes(savedView) ? savedView : 'home')
const savedPrimaryView = localStorage.getItem(primaryViewKey)
const primaryView = ref<'home' | 'search'>(savedPrimaryView === 'search' ? 'search' : 'home')
let handlingHistory = false
const historyView = (value: unknown): AppView | null => typeof value === 'string' && validViews.includes(value as AppView) ? value as AppView : null

// Seed a real WebView history entry so Android's system back gesture navigates
// inside the app before it is allowed to close the window.
history.replaceState({ ...history.state, rubiaView: 'home' }, '')
if (activeView.value !== 'home') history.pushState({ ...history.state, rubiaView: activeView.value }, '')

watch(activeView, view => {
  localStorage.setItem(storageKey, view)
  if (view === 'home' || view === 'search') { primaryView.value = view; localStorage.setItem(primaryViewKey, view) }
})
window.addEventListener('popstate', event => {
  const view = historyView(event.state?.rubiaView)
  if (!view) return
  handlingHistory = true; activeView.value = view; handlingHistory = false
})
export const navigateTo = (view: AppView) => {
  if (activeView.value === view) return
  activeView.value = view
  if (!handlingHistory) history.pushState({ ...history.state, rubiaView: view }, '')
}
export const navigateToPrimary = () => navigateTo(window.matchMedia('(max-width: 680px)').matches ? primaryView.value : 'home')
