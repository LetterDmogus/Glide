<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  Sparkles, ArrowLeft, Package, Check, Download, 
  Search, ShieldCheck, Zap, Layers, Wrench, Play
} from 'lucide-vue-next'
import type { ExtensionItem } from '../electron.d'

const props = defineProps<{
  projectPath?: string
}>()

const emit = defineEmits<{
  'close': []
  'skill-installed': []
  'run-validator': []
}>()

const extensions = ref<ExtensionItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const activeFilter = ref<'all' | 'plugins' | 'skills' | 'installed'>('all')
const installingName = ref<string | null>(null)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

async function fetchExtensions() {
  isLoading.value = true
  try {
    const list = await window.electronAPI?.listSkills?.(props.projectPath)
    if (list) {
      extensions.value = list
    }
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat daftar ekstensi & plugins.'
  } finally {
    isLoading.value = false
  }
}

const filteredExtensions = computed(() => {
  return extensions.value.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    if (!matchesSearch) return false

    if (activeFilter.value === 'installed') return item.isInstalled
    if (activeFilter.value === 'plugins') return item.type === 'plugin'
    if (activeFilter.value === 'skills') return item.type === 'skill'
    return true
  })
})

const installedCount = computed(() => extensions.value.filter(s => s.isInstalled).length)
const pluginCount = computed(() => extensions.value.filter(s => s.type === 'plugin').length)
const skillCount = computed(() => extensions.value.filter(s => s.type === 'skill').length)

async function installExtension(item: ExtensionItem) {
  if (!props.projectPath) {
    errorMsg.value = 'Silakan buka folder proyek terlebih dahulu sebelum memasang ekstensi.'
    return
  }

  installingName.value = item.name
  errorMsg.value = null
  successMsg.value = null

  try {
    const res = await window.electronAPI?.installSkill?.(props.projectPath, item.name)
    if (res?.success) {
      const typeLabel = item.type === 'plugin' ? 'Plugin' : 'AI Skill'
      successMsg.value = `${typeLabel} "${item.title}" berhasil dipasang ke proyek!`
      await fetchExtensions()
      emit('skill-installed')
    } else {
      errorMsg.value = res?.error || 'Gagal memasang ekstensi.'
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Terjadi kesalahan sistem saat memasang ekstensi.'
  } finally {
    installingName.value = null
  }
}

function handleRunValidator() {
  emit('run-validator')
}

onMounted(fetchExtensions)
</script>

<template>
  <div class="skills-page">
    <!-- Topbar Header Navigation -->
    <header class="skills-topbar">
      <div class="topbar-left">
        <button class="back-btn" @click="emit('close')" title="Kembali ke Workspace">
          <ArrowLeft :size="16" />
          <span>Kembali</span>
        </button>
        <div class="topbar-divider"></div>
        <h1 class="page-title">Extensions & Plugins Hub</h1>
      </div>
    </header>

    <!-- Main Store Container -->
    <div class="store-container">
      <!-- Left Sidebar Navigation -->
      <aside class="store-sidebar">
        <div class="nav-section-title">KATEGORI</div>
        
        <button 
          class="nav-item" 
          :class="{ active: activeFilter === 'all' }" 
          @click="activeFilter = 'all'"
        >
          <Layers :size="15" />
          <span>Semua Ekstensi</span>
          <span class="count-badge">{{ extensions.length }}</span>
        </button>

        <button 
          class="nav-item" 
          :class="{ active: activeFilter === 'plugins' }" 
          @click="activeFilter = 'plugins'"
        >
          <Wrench :size="15" />
          <span>Plugins & Tools</span>
          <span class="count-badge">{{ pluginCount }}</span>
        </button>

        <button 
          class="nav-item" 
          :class="{ active: activeFilter === 'skills' }" 
          @click="activeFilter = 'skills'"
        >
          <Sparkles :size="15" />
          <span>AI Skills & Rules</span>
          <span class="count-badge">{{ skillCount }}</span>
        </button>

        <div class="nav-divider"></div>
        <div class="nav-section-title">STATUS PROYEK</div>

        <button 
          class="nav-item" 
          :class="{ active: activeFilter === 'installed' }" 
          @click="activeFilter = 'installed'"
        >
          <ShieldCheck :size="15" />
          <span>Terpasang di Proyek</span>
          <span class="count-badge active-badge">{{ installedCount }}</span>
        </button>
      </aside>

      <!-- Store Main View -->
      <main class="store-main custom-scroll">
        <div class="store-content">
          <!-- Search Row -->
          <div class="store-header">
            <div class="search-bar-row">
              <div class="search-input-wrapper">
                <Search :size="15" class="search-icon" />
                <input 
                  type="text" 
                  v-model="searchQuery" 
                  placeholder="Cari plugins validator, alat bantu, dan aturan AI..." 
                  class="search-input"
                />
              </div>
            </div>

            <!-- Toast Messages -->
            <div v-if="successMsg" class="toast toast-success">
              <Check :size="14" />
              <span>{{ successMsg }}</span>
            </div>
            <div v-if="errorMsg" class="toast toast-error">
              <span>{{ errorMsg }}</span>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="loading-state">
            <Sparkles :size="20" class="spin icon-accent" />
            <span>Memuat ekstensi dan plugins...</span>
          </div>

          <!-- Extensions List -->
          <div v-else-if="filteredExtensions.length > 0" class="skills-list">
            <div 
              v-for="item in filteredExtensions" 
              :key="item.name" 
              class="skill-item"
              :class="{ 'installed-item': item.isInstalled }"
            >
              <div class="item-left">
                <div class="skill-icon-badge" :class="item.type === 'plugin' ? 'badge-plugin' : 'badge-skill'">
                  <Wrench v-if="item.type === 'plugin'" :size="18" />
                  <Zap v-else :size="18" />
                </div>
              </div>

              <div class="item-content">
                <div class="title-row">
                  <div class="title-wrap">
                    <h3 class="skill-title">{{ item.title }}</h3>
                    <span class="type-pill" :class="item.type === 'plugin' ? 'pill-plugin' : 'pill-skill'">
                      {{ item.type === 'plugin' ? 'PLUGIN' : 'AI SKILL' }}
                    </span>
                  </div>
                  <span class="skill-folder-name">
                    <code>{{ item.type === 'plugin' ? 'scripts/validator.js & validate.bat' : `.agents/skills/${item.name}` }}</code>
                  </span>
                </div>

                <p class="skill-desc">{{ item.description }}</p>
              </div>

              <div class="item-actions">
                <!-- Jalankan Validator Button for Validator Plugin -->
                <button 
                  v-if="item.canRun" 
                  class="btn-run-tool" 
                  @click="handleRunValidator"
                  title="Jalankan pemeriksaan linter sekarang"
                >
                  <Play :size="13" />
                  <span>Jalankan Validator</span>
                </button>

                <!-- Install Script / Skill Button -->
                <template v-if="item.isInstalled">
                  <span class="installed-tag">
                    <Check :size="13" />
                    <span>{{ item.type === 'plugin' ? 'Script Terpasang' : 'Terpasang' }}</span>
                  </span>
                </template>
                <template v-else>
                  <button 
                    class="btn-install" 
                    :disabled="installingName === item.name"
                    @click="installExtension(item)"
                  >
                    <Download :size="13" />
                    <span>{{ installingName === item.name ? 'Memasang...' : (item.type === 'plugin' ? 'Pasang Script (BAT)' : 'Install ke Proyek') }}</span>
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <Package :size="36" class="empty-icon" />
            <h3>Tidak Ada Ekstensi Ditemukan</h3>
            <p>Tidak ada ekstensi yang cocok dengan kriteria pencarian Anda.</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.skills-page {
  position: absolute;
  inset: 0;
  z-index: 2000;
  background: #0f111a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}

.skills-topbar {
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #141622;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.topbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.page-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #fff;
  margin: 0;
}

/* Store Layout */
.store-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.store-sidebar {
  width: 220px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #12141e;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.nav-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
  padding: 8px 10px 4px;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 10px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.nav-item.active {
  background: rgba(124, 106, 247, 0.15);
  color: #fff;
  font-weight: 600;
}

.count-badge {
  margin-left: auto;
  font-size: 11px;
  color: #64748b;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.active-badge {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

.store-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.store-content {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header & Search */
.store-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-bar-row {
  display: flex;
  gap: 12px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #64748b;
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: #181a26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 14px 10px 38px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: all 0.15s;
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(124, 106, 247, 0.2);
}

/* Toast Messages */
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  animation: fadeIn 0.2s ease;
}

.toast-success {
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.toast-error {
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
}

/* Loading State */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: #94a3b8;
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* List & Items */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-item {
  background: #161826;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.skill-item:hover {
  border-color: rgba(255, 255, 255, 0.16);
  background: #181b2b;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.installed-item {
  border-color: rgba(74, 222, 128, 0.2);
}

.item-left {
  flex-shrink: 0;
}

.skill-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-skill {
  background: rgba(124, 106, 247, 0.15);
  color: var(--accent);
}

.badge-plugin {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.skill-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.type-pill {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
}

.pill-plugin {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.pill-skill {
  background: rgba(124, 106, 247, 0.15);
  color: var(--accent);
  border: 1px solid rgba(124, 106, 247, 0.3);
}

.skill-folder-name code {
  font-size: 11px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
}

.skill-desc {
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.item-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 8px;
}

.btn-run-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: #38bdf8;
  color: #0f172a;
  border: none;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-run-tool:hover {
  background: #7dd3fc;
}

.btn-install {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-install:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.btn-install:disabled {
  opacity: 0.6;
  cursor: default;
}

.installed-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: #4ade80;
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(74, 222, 128, 0.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  text-align: center;
}

.empty-icon {
  color: #475569;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.empty-state p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}
</style>
