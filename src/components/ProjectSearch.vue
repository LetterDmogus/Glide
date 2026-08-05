<script setup lang="ts">
import { ref } from 'vue'
import { Search, X, Regex } from 'lucide-vue-next'

const props = defineProps<{ projectPath?: string }>()
const emit = defineEmits<{ close: []; open: [path: string] }>()
const query = ref('')
const regex = ref(false)
const caseSensitive = ref(false)
const loading = ref(false)
const results = ref<Array<{ path: string; line: number; text: string }>>([])

async function search() {
  if (!props.projectPath || !query.value.trim()) return
  loading.value = true
  results.value = await window.electronAPI?.searchProject(props.projectPath, query.value, {
    regex: regex.value, caseSensitive: caseSensitive.value
  }) || []
  loading.value = false
}

function fileName(path: string) { return path.split(/[\\/]/).pop() || path }
function relativePath(path: string) {
  const root = props.projectPath?.replace(/\\/g, '/').replace(/\/$/, '')
  const value = path.replace(/\\/g, '/')
  return root && value.startsWith(`${root}/`) ? value.slice(root.length + 1) : value
}
</script>

<template>
  <div class="project-search-backdrop" @click.self="emit('close')">
    <section class="project-search">
      <header><span><Search :size="16" /> Search in Project</span><button @click="emit('close')"><X :size="16" /></button></header>
      <div class="search-controls">
        <input v-model="query" autofocus placeholder="Search files..." @keydown.enter="search" />
        <button class="search-button" @click="search"><Search :size="14" /></button>
      </div>
      <div class="search-options">
        <label><input v-model="caseSensitive" type="checkbox" /> Case sensitive</label>
        <label><input v-model="regex" type="checkbox" /> <Regex :size="13" /> Regular expression</label>
      </div>
      <div class="search-status" v-if="loading">Searching...</div>
      <div class="search-status" v-else-if="query && results.length === 0">No matches found</div>
      <div class="search-results">
        <button v-for="(result, index) in results" :key="`${result.path}:${result.line}:${index}`" class="search-result" @click="emit('open', result.path)">
          <div class="result-title"><span>{{ fileName(result.path) }}</span><span>line {{ result.line }}</span></div>
          <div class="result-path">{{ relativePath(result.path) }}</div>
          <div class="result-text">{{ result.text }}</div>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.project-search-backdrop { position:fixed; inset:0; z-index:2900; display:flex; justify-content:center; align-items:flex-start; padding-top:90px; background:rgba(0,0,0,.35); }
.project-search { width:640px; max-width:92vw; max-height:75vh; overflow:hidden; background:var(--bg-elevated); border:1px solid var(--border-focus); border-radius:8px; box-shadow:0 12px 40px rgba(0,0,0,.5); color:var(--text-primary); }
header { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid var(--border); } header span { display:flex; align-items:center; gap:7px; } header button { border:0; background:transparent; color:var(--text-muted); cursor:pointer; }
.search-controls { display:flex; gap:6px; padding:12px 14px 6px; } input { min-width:0; flex:1; padding:8px 10px; background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border); border-radius:5px; outline:none; } input:focus { border-color:var(--accent); }
.search-button { width:36px; border:0; border-radius:5px; background:var(--accent); color:white; cursor:pointer; }
.search-options { display:flex; gap:16px; padding:4px 14px 10px; color:var(--text-secondary); font-size:11px; } .search-options label { display:flex; align-items:center; gap:5px; }
.search-status { padding:14px; color:var(--text-muted); font-size:12px; } .search-results { max-height:56vh; overflow:auto; border-top:1px solid var(--border); }
.search-result { display:block; width:100%; padding:9px 14px; text-align:left; border:0; border-bottom:1px solid var(--border); background:transparent; color:var(--text-primary); cursor:pointer; } .search-result:hover { background:var(--bg-hover); }
.result-title { display:flex; justify-content:space-between; font-size:12px; } .result-title span:last-child { color:var(--accent); font-size:10px; } .result-path,.result-text { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:10px; color:var(--text-muted); } .result-text { margin-top:3px; color:var(--text-secondary); font-family:monospace; }
</style>
