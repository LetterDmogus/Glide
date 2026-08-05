<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  Sparkles, ArrowLeft, Package, Check, Download, 
  Search, ShieldCheck, Zap, Layers 
} from 'lucide-vue-next'

export interface SkillItem {
  name: string
  title: string
  description: string
  isInstalled?: boolean
}

const props = defineProps<{
  projectPath?: string
}>()

const emit = defineEmits<{
  'close': []
  'skill-installed': []
}>()

const skills = ref<SkillItem[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const activeFilter = ref<'all' | 'installed'>('all')
const installingName = ref<string | null>(null)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

async function fetchSkills() {
  isLoading.value = true
  try {
    const list = await window.electronAPI?.listSkills?.(props.projectPath)
    if (list) {
      skills.value = list
    }
  } catch (err: any) {
    errorMsg.value = 'Gagal memuat daftar AI skills.'
  } finally {
    isLoading.value = false
  }
}

const filteredSkills = computed(() => {
  return skills.value.filter(skill => {
    const matchesSearch = skill.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          skill.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          skill.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    if (activeFilter.value === 'installed') {
      return matchesSearch && skill.isInstalled
    }
    return matchesSearch
  })
})

const installedCount = computed(() => skills.value.filter(s => s.isInstalled).length)

async function installSkill(skillName: string) {
  if (!props.projectPath) {
    errorMsg.value = 'Silakan buka folder proyek terlebih dahulu sebelum memasang skill.'
    return
  }

  installingName.value = skillName
  errorMsg.value = null
  successMsg.value = null

  try {
    const res = await window.electronAPI?.installSkill?.(props.projectPath, skillName)
    if (res?.success) {
      successMsg.value = `Skill "${skillName}" berhasil dipasang ke .agents/skills/`
      // Refresh list status
      await fetchSkills()
      emit('skill-installed')
    } else {
      errorMsg.value = res?.error || 'Gagal memasang skill.'
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Terjadi kesalahan sistem saat memasang skill.'
  } finally {
    installingName.value = null
  }
}

onMounted(fetchSkills)
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
        <h1 class="page-title">AI Skills & Rules Store</h1>
      </div>
    </header>

    <!-- Main Store Container -->
    <div class="store-container">
      <!-- Left Sidebar Navigation -->
      <aside class="store-sidebar">
        <div class="nav-section-title">SKILLS & RULES</div>
        
        <button 
          class="nav-item" 
          :class="{ active: activeFilter === 'all' }" 
          @click="activeFilter = 'all'"
        >
          <Layers :size="15" />
          <span>Semua Skills</span>
          <span class="count-badge">{{ skills.length }}</span>
        </button>

        <button 
          class="nav-item" 
          :class="{ active: activeFilter === 'installed' }" 
          @click="activeFilter = 'installed'"
        >
          <ShieldCheck :size="15" />
          <span>Terpasang</span>
          <span class="count-badge active-badge">{{ installedCount }}</span>
        </button>
      </aside>

      <!-- Store Main View -->
      <main class="store-main custom-scroll">
        <div class="store-content">
          <!-- Banner Section -->
          <div class="store-header">
            <div class="search-bar-row">
              <div class="search-input-wrapper">
                <Search :size="15" class="search-icon" />
                <input 
                  type="text" 
                  v-model="searchQuery" 
                  placeholder="Cari instruksi & aturan AI..." 
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
            <span>Memindai AI Skills dari public/skills/...</span>
          </div>

          <!-- Skills Grid -->
          <div v-else-if="filteredSkills.length > 0" class="skills-grid">
            <div 
              v-for="skill in filteredSkills" 
              :key="skill.name" 
              class="skill-card"
              :class="{ 'installed-card': skill.isInstalled }"
            >
              <div class="card-header">
                <div class="skill-icon-badge">
                  <Zap :size="18" class="icon-accent" />
                </div>
                <div class="skill-meta">
                  <h3 class="skill-title">{{ skill.title }}</h3>
                  <span class="skill-folder-name"><code>.agents/skills/{{ skill.name }}</code></span>
                </div>
              </div>

              <p class="skill-desc">{{ skill.description }}</p>

              <div class="card-footer">
                <template v-if="skill.isInstalled">
                  <span class="installed-tag">
                    <Check :size="13" />
                    <span>Terpasang di Proyek</span>
                  </span>
                </template>
                <template v-else>
                  <button 
                    class="btn-install" 
                    :disabled="installingName === skill.name"
                    @click="installSkill(skill.name)"
                  >
                    <Download :size="13" />
                    <span>{{ installingName === skill.name ? 'Memasang...' : 'Install ke Proyek' }}</span>
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <Package :size="36" class="empty-icon" />
            <h3>Tidak Ada Skill Ditemukan</h3>
            <p>Tidak ada instruksi AI yang cocok dengan pencarian Anda.</p>
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
  font-size: 12.5px;
  transition: background 0.15s, color 0.15s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.topbar-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: #f8fafc;
}

.store-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.store-sidebar {
  width: 220px;
  background: #141622;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #64748b;
  padding: 4px 10px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f1f5f9;
}
.nav-item.active {
  background: var(--bg-hover);
  color: var(--accent);
  font-weight: 500;
}

.count-badge {
  margin-left: auto;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 7px;
  border-radius: 10px;
  color: #94a3b8;
}
.active-badge {
  background: var(--accent-soft);
  color: var(--accent);
}

.store-main {
  flex: 1;
  padding: 30px 40px;
  overflow-y: auto;
}

.store-content {
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}
.search-input {
  width: 100%;
  background: #161824;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  color: #f8fafc;
  font-size: 13px;
}
.search-input:focus {
  border-color: var(--accent);
  outline: none;
}

.toast {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.2s ease-in-out;
}
.toast-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}
.toast-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.skill-card {
  background: #161824;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  transition: border-color 0.2s, transform 0.2s;
}
.skill-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}
.installed-card {
  border-color: var(--accent-soft);
  background: rgba(22, 24, 36, 0.7);
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.skill-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.skill-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-title {
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
}

.skill-folder-name code {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
}

.skill-desc {
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}

.card-footer {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-install {
  width: 100%;
  padding: 7px 12px;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: filter 0.15s;
}
.btn-install:hover:not(:disabled) {
  filter: brightness(1.1);
}
.btn-install:disabled {
  opacity: 0.5;
  cursor: default;
}

.installed-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #10b981;
  font-weight: 500;
}

.loading-state, .empty-state {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
  text-align: center;
}

.icon-accent { color: var(--accent); }
.spin { animation: spin 1s linear infinite; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
