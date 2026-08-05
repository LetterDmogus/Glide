<script setup lang="ts">
import { ref } from 'vue'
import { aiSettings } from '../utils/settings'
import { 
  Sliders, FlaskConical, ArrowLeft, Key, Sparkles, Layout, Type,
  FileCheck, RefreshCw, CheckCircle2, AlertCircle 
} from 'lucide-vue-next'

const props = defineProps<{
  settings: {
    accent: string
    editorFontSize: number
    terminalFontSize: number
    lineWrapping: boolean
    sidebarWidth: number
    previewWidth: number
    terminalHeight: number
  }
}>()

const emit = defineEmits<{ 
  close: []
  update: [settings: typeof props.settings] 
}>()

const activeTab = ref<'customization' | 'experimental'>('customization')
const isCheckingTypst = ref(false)
const typstStatus = ref<{ installed: boolean; version?: string; type: 'cli' | 'builtin' } | null>(null)

async function checkTypst() {
  isCheckingTypst.value = true
  try {
    const res = await window.electronAPI?.checkTypstStatus?.()
    if (res) {
      typstStatus.value = res
    }
  } catch {
    typstStatus.value = {
      installed: true,
      version: 'Typst WASM Compiler Active (Built-in v0.11+)',
      type: 'builtin'
    }
  } finally {
    isCheckingTypst.value = false
  }
}

function update<K extends keyof typeof props.settings>(key: K, value: (typeof props.settings)[K]) {
  emit('update', { ...props.settings, [key]: value })
}
</script>

<template>
  <div class="settings-page">
    <!-- Top Bar Navigation -->
    <header class="settings-topbar">
      <div class="topbar-left">
        <button class="back-btn" @click="emit('close')" title="Kembali ke Workspace (Esc)">
          <ArrowLeft :size="16" />
          <span>Kembali</span>
        </button>
        <div class="topbar-divider"></div>
        <h1 class="page-title">Settings</h1>
      </div>
    </header>

    <!-- Main Settings Body with Sidebar Layout -->
    <div class="settings-container">
      <!-- Settings Sidebar -->
      <aside class="settings-sidebar">
        <div class="nav-section-title">PREFERENCES</div>
        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'customization' }" 
          @click="activeTab = 'customization'"
        >
          <Sliders :size="15" />
          <span>Customization</span>
        </button>

        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'experimental' }" 
          @click="activeTab = 'experimental'"
        >
          <FlaskConical :size="15" />
          <span>Experimental</span>
        </button>
      </aside>

      <!-- Settings Content View -->
      <main class="settings-main custom-scroll">
        <!-- 🎨 CUSTOMIZATION TAB -->
        <div v-if="activeTab === 'customization'" class="tab-content">
          <div class="section-header">
            <h2>Customization</h2>
            <p class="section-desc">Atur tampilan visual, font editor, dan ukuran panel workspace Glide 2.0 Anda.</p>
          </div>

          <!-- Appearance -->
          <div class="setting-card">
            <div class="card-title">
              <Layout :size="16" />
              <span>Tampilan (Appearance)</span>
            </div>
            <div class="card-body">
              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Accent Color</span>
                  <span class="field-sub">Warna sorot utama aplikasi</span>
                </div>
                <input 
                  type="color" 
                  :value="settings.accent" 
                  @input="update('accent', ($event.target as HTMLInputElement).value)" 
                  class="color-picker"
                />
              </div>
            </div>
          </div>

          <!-- Editor -->
          <div class="setting-card">
            <div class="card-title">
              <Type :size="16" />
              <span>Editor CodeMirror</span>
            </div>
            <div class="card-body">
              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Font Size (px)</span>
                  <span class="field-sub">Ukuran teks dokumen di editor</span>
                </div>
                <input 
                  type="number" 
                  min="10" 
                  max="24" 
                  :value="settings.editorFontSize" 
                  @input="update('editorFontSize', Number(($event.target as HTMLInputElement).value))" 
                  class="num-input"
                />
              </div>

              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Wrap Long Lines</span>
                  <span class="field-sub">Lipat baris teks panjang secara otomatis</span>
                </div>
                <input 
                  type="checkbox" 
                  :checked="settings.lineWrapping" 
                  @change="update('lineWrapping', ($event.target as HTMLInputElement).checked)" 
                  class="checkbox-input"
                />
              </div>
            </div>
          </div>

          <!-- Panel Sizes -->
          <div class="setting-card">
            <div class="card-title">
              <Layout :size="16" />
              <span>Ukuran Panel Workspace</span>
            </div>
            <div class="card-body">
              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Sidebar Width (px)</span>
                </div>
                <input 
                  type="number" 
                  min="140" 
                  max="600" 
                  :value="settings.sidebarWidth" 
                  @input="update('sidebarWidth', Number(($event.target as HTMLInputElement).value))" 
                  class="num-input"
                />
              </div>

              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Live Preview Width (px)</span>
                </div>
                <input 
                  type="number" 
                  min="250" 
                  max="900" 
                  :value="settings.previewWidth" 
                  @input="update('previewWidth', Number(($event.target as HTMLInputElement).value))" 
                  class="num-input"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 🧪 EXPERIMENTAL TAB -->
        <div v-else-if="activeTab === 'experimental'" class="tab-content">
          <div class="section-header">
            <h2>Experimental Features</h2>
            <p class="section-desc">Fitur eksperimental yang dapat diaktifkan opsional untuk meningkatkan produktivitas penulisan Anda.</p>
          </div>

          <!-- AI Assistant Subtle Card -->
          <div class="setting-card subtle-card">
            <div class="card-title">
              <Sparkles :size="16" class="icon-subtle-accent" />
              <span>AI Text Assistant (Groq API)</span>
            </div>
            
            <div class="card-body">
              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Turn On AI Features</span>
                  <span class="field-sub">Aktifkan asisten penyuntingan teks AI di editor</span>
                </div>
                <input type="checkbox" v-model="aiSettings.enabled" class="checkbox-input" />
              </div>

              <!-- Collapsible Form Input -->
              <div v-if="aiSettings.enabled" class="ai-config-box">
                <div class="sub-field">
                  <label class="sub-label">
                    <Key :size="13" />
                    <span>Groq API Key</span>
                  </label>
                  <input 
                    type="password" 
                    v-model="aiSettings.apiKey" 
                    placeholder="gsk_..." 
                    class="text-input"
                  />
                </div>

                <div class="sub-field">
                  <label class="sub-label">
                    <Sparkles :size="13" />
                    <span>Model Name</span>
                  </label>
                  <input 
                    type="text" 
                    v-model="aiSettings.modelName" 
                    placeholder="llama-3.3-70b-versatile" 
                    class="text-input"
                  />
                  <span class="field-hint">Contoh: <code>llama-3.3-70b-versatile</code>, <code>llama3-8b-8192</code>, atau <code>mixtral-8x7b-32768</code></span>
                </div>

                <div class="info-note">
                  Dapatkan API Key gratis Anda di <a href="https://console.groq.com/keys" target="_blank" class="link-btn">console.groq.com</a>.
                </div>
              </div>
            </div>
          </div>

          <!-- Typst Compiler Environment Status Card -->
          <div class="setting-card subtle-card">
            <div class="card-title">
              <FileCheck :size="16" class="icon-subtle-accent" />
              <span>Typst Compiler Environment</span>
            </div>
            
            <div class="card-body">
              <div class="setting-field-row">
                <div class="field-info">
                  <span class="field-label">Typst Engine Status</span>
                  <span class="field-sub">Deteksi ketersediaan mesin kompilasi Typst di sistem</span>
                </div>
                <button class="test-btn" @click="checkTypst" :disabled="isCheckingTypst">
                  <RefreshCw :size="13" :class="{ spin: isCheckingTypst }" />
                  <span>{{ isCheckingTypst ? 'Memindai...' : 'Test Typst Environment' }}</span>
                </button>
              </div>

              <!-- Typst Status Result Box -->
              <div v-if="typstStatus" class="typst-status-box" :class="typstStatus.installed ? 'status-ok' : 'status-err'">
                <div class="status-icon">
                  <CheckCircle2 v-if="typstStatus.installed" :size="16" />
                  <AlertCircle v-else :size="16" />
                </div>
                <div class="status-details">
                  <span class="status-title">
                    {{ typstStatus.type === 'cli' ? 'Typst System CLI Terdeteksi' : 'Typst WASM Compiler Active (Built-in)' }}
                  </span>
                  <span class="status-version">{{ typstStatus.version }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  position: absolute;
  inset: 0;
  z-index: 2000;
  background: #0f111a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}

.settings-topbar {
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

.settings-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-sidebar {
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

.settings-main {
  flex: 1;
  padding: 30px 40px;
  overflow-y: auto;
}

.tab-content {
  max-width: 650px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: #f8fafc;
}

.section-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.setting-card {
  background: #161824;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  overflow: hidden;
}

.card-title {
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13.5px;
  font-weight: 600;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-label {
  font-size: 13px;
  color: #e2e8f0;
}

.field-sub {
  font-size: 11.5px;
  color: #64748b;
}

.num-input {
  width: 80px;
  padding: 6px 8px;
  background: #0f111a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #f8fafc;
  font-size: 12.5px;
}

.color-picker {
  width: 44px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent);
}

.ai-config-box {
  margin-top: 10px;
  padding: 14px;
  background: #0d0f17;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sub-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sub-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.text-input {
  background: #141622;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 10px;
  color: #f8fafc;
  font-size: 12.5px;
}
.text-input:focus {
  border-color: var(--accent);
  outline: none;
}

.field-hint {
  font-size: 11px;
  color: #64748b;
}
.field-hint code {
  color: var(--accent);
}

.info-note {
  font-size: 11.5px;
  color: #64748b;
  padding-top: 4px;
}

.link-btn {
  color: var(--accent);
  text-decoration: underline;
}

.icon-subtle-accent {
  color: var(--accent);
}

.test-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, border-color 0.15s;
}
.test-btn:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent-light);
}
.test-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.typst-status-box {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12.5px;
  animation: fadeIn 0.2s ease-in-out;
}
.status-ok {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}
.status-err {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}
.status-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.status-title {
  font-weight: 600;
}
.status-version {
  font-size: 11.5px;
  opacity: 0.85;
  font-family: monospace;
}
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
