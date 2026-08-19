<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TrackList from '../../components/music/TrackList.vue'
import { useLibrary } from './libraryStore'

const props = defineProps<{ mode: 'favorites' | 'playlists' | 'recent' }>()
const library = useLibrary()
const selectedId = ref('default')
const editorMode = ref<'create' | 'rename' | null>(null)
const draftName = ref('')
const editorError = ref('')
const selectedPlaylist = computed(() => library.playlists.value.find(item => item.id === selectedId.value) ?? library.playlists.value[0])
const config = computed(() => props.mode === 'favorites'
  ? { eyebrow: '资料库', title: '收藏歌曲', empty: '还没有收藏歌曲', tracks: library.favorites.value }
  : { eyebrow: '播放记录', title: '最近播放', empty: '还没有播放记录', tracks: library.recent.value })

watch(library.playlists, playlists => { if (!playlists.some(item => item.id === selectedId.value)) selectedId.value = playlists[0]?.id ?? 'default' })
const openEditor = (mode: 'create' | 'rename') => { editorMode.value = mode; draftName.value = mode === 'rename' ? selectedPlaylist.value?.name ?? '' : ''; editorError.value = '' }
const closeEditor = () => { editorMode.value = null; draftName.value = ''; editorError.value = '' }
const saveEditor = () => {
  try {
    if (editorMode.value === 'create') { const playlist = library.createPlaylist(draftName.value); selectedId.value = playlist.id }
    else if (editorMode.value === 'rename' && selectedPlaylist.value) library.renamePlaylist(selectedPlaylist.value.id, draftName.value)
    closeEditor()
  } catch (error) { editorError.value = error instanceof Error ? error.message : String(error) }
}
const removeSelected = () => {
  const playlist = selectedPlaylist.value
  if (!playlist || playlist.id === 'default' || !confirm(`确定删除歌单「${playlist.name}」吗？歌单内的歌曲不会从收藏中删除。`)) return
  library.deletePlaylist(playlist.id); selectedId.value = 'default'
}
</script>

<template>
  <section v-if="mode === 'playlists'" class="library-view playlist-view">
    <header class="library-heading playlist-heading"><div><p>我的音乐</p><h1>歌单</h1></div><button class="create-playlist" @click="openEditor('create')"><span>＋</span>新建歌单</button></header>
    <form v-if="editorMode" class="playlist-editor" @submit.prevent="saveEditor"><div><strong>{{ editorMode === 'create' ? '创建新歌单' : '重命名歌单' }}</strong><small v-if="editorError">{{ editorError }}</small></div><input v-model="draftName" maxlength="30" autofocus placeholder="歌单名称"/><button type="button" @click="closeEditor">取消</button><button class="primary" type="submit">保存</button></form>
    <div class="playlist-switcher" aria-label="选择歌单"><button v-for="playlist in library.playlists.value" :key="playlist.id" :class="{ active: selectedPlaylist?.id === playlist.id }" @click="selectedId=playlist.id"><span>♫</span><strong>{{ playlist.name }}</strong><small>{{ playlist.tracks.length }} 首</small></button></div>
    <header v-if="selectedPlaylist" class="playlist-detail"><div><p>当前歌单</p><h2>{{ selectedPlaylist.name }}</h2><small>{{ selectedPlaylist.tracks.length }} 首歌曲</small></div><div v-if="selectedPlaylist.id !== 'default'"><button @click="openEditor('rename')">重命名</button><button class="danger" @click="removeSelected">删除</button></div></header>
    <TrackList v-if="selectedPlaylist?.tracks.length" :tracks="selectedPlaylist.tracks" removable :playlist-id="selectedPlaylist.id"/>
    <div v-else class="library-empty"><span>♫</span><p>这个歌单还是空的</p><small>在搜索结果中点击“＋”，然后选择此歌单</small></div>
  </section>
  <section v-else class="library-view">
    <header class="library-heading"><p>{{ config.eyebrow }}</p><h1>{{ config.title }}</h1><span>{{ config.tracks.length }} 首歌曲</span></header>
    <TrackList v-if="config.tracks.length" :tracks="config.tracks"/>
    <div v-else class="library-empty"><span>♫</span><p>{{ config.empty }}</p><small>可在搜索结果中使用收藏或添加按钮</small></div>
  </section>
</template>
