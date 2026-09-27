<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiSettings, compilerSettings } from '../utils/settings'
import { 
  Sliders, FlaskConical, ArrowLeft, Key, Sparkles, Layout, Type,
  FileCheck, RefreshCw, CheckCircle2, AlertCircle, Download, ExternalLink, Info
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

const activeTab = ref<'customization' | 'experimental' | 'about'>('customization')
const isCheckingTypst = ref(false)
const typstStatus = ref<{ installed: boolean; version?: string; type: 'cli' | 'builtin' } | null>(null)

// ── App Version State (From package.json via Electron) ──
const appVersion = ref<string>('2.1.0')

onMounted(async () => {
  try {
    const ver = await window.electronAPI?.getAppVersion?.()
    if (ver) {
      appVersion.value = ver
    }
  } catch {
    // Fallback default
  }
})

// ── Update Checker State ──
const isCheckingUpdate = ref(false)
const updateResult = ref<{
  success: boolean
  currentVersion?: string
  latestVersion?: string
  isUpdateAvailable?: boolean
  releaseName?: string
  releaseNotes?: string
  releaseUrl?: string
  error?: string
  message?: string
} | null>(null)

async function checkForUpdates() {
  isCheckingUpdate.value = true
  updateResult.value = null
  try {
    const res = await window.electronAPI?.checkUpdate?.()
    updateResult.value = res ?? null
  } catch (err: any) {
    updateResult.value = {
      success: false,
      error: err?.message || 'Failed to connect to GitHub'
    }
  } finally {
    isCheckingUpdate.value = false
  }
}

function openReleaseUrl(url?: string) {
  const target = url || updateResult.value?.releaseUrl || 'https://github.com/LetterDmogus/Glide/releases'
  window.electronAPI?.openExternal?.(target)
}

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
        <button class="back-btn" @click="emit('close')" title="Return to Workspace (Esc)">
          <ArrowLeft :size="15" />
          <span>Back</span>
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

        <button 
          class="nav-item" 
          :class="{ active: activeTab === 'about' }" 
          @click="activeTab = 'about'"
        >
          <Info :size="15" />
          <span>About & Updates</span>
        </button>
      </aside>

      <!-- Settings Content View (Flat Clean Cardless Design) -->
      <main class="settings-main custom-scroll">
        <!-- 🎨 CUSTOMIZATION TAB -->
        <div v-if="activeTab === 'customization'" class="tab-content">
          <div class="section-header">
            <h2>Customization</h2>
            <p class="section-desc">Manage visual themes, editor typography, and layout options for your workspace.</p>
          </div>

          <!-- Section: Appearance -->
          <div class="flat-group">
            <h3 class="group-title">
              <Layout :size="15" />
              <span>Appearance</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Accent Color</span>
                <span class="field-sub">Primary brand accent color across the application</span>
              </div>
              <input 
                type="color" 
                :value="settings.accent" 
                @input="update('accent', ($event.target as HTMLInputElement).value)" 
                class="color-picker"
              />
            </div>
          </div>

          <!-- Section: CodeMirror Editor -->
          <div class="flat-group">
            <h3 class="group-title">
              <Type :size="15" />
              <span>Code Editor</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Font Size (px)</span>
                <span class="field-sub">Font size for CodeMirror document editor</span>
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

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Word Wrap</span>
                <span class="field-sub">Automatically wrap long lines of code</span>
              </div>
              <input 
                type="checkbox" 
                :checked="settings.lineWrapping" 
                @change="update('lineWrapping', ($event.target as HTMLInputElement).checked)" 
                class="checkbox-input"
              />
            </div>
          </div>

          <!-- Section: Workspace Dimensions -->
          <div class="flat-group">
            <h3 class="group-title">
              <Layout :size="15" />
              <span>Workspace Layout</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Sidebar Width (px)</span>
                <span class="field-sub">Default width for project file explorer</span>
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

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Live Preview Width (px)</span>
                <span class="field-sub">Default width for Typst document preview</span>
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

        <!-- 🧪 EXPERIMENTAL TAB -->
        <div v-else-if="activeTab === 'experimental'" class="tab-content">
          <div class="section-header">
            <h2>Experimental Features</h2>
            <p class="section-desc">Optional experimental features to enhance your writing productivity.</p>
          </div>

          <!-- Section: AI Assistant -->
          <div class="flat-group">
            <h3 class="group-title">
              <Sparkles :size="15" class="icon-subtle-accent" />
              <span>AI Assistant (Groq API)</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Enable AI Features</span>
                <span class="field-sub">Activate AI-powered inline editing in Code Editor</span>
              </div>
              <input type="checkbox" v-model="aiSettings.enabled" class="checkbox-input" />
            </div>

            <!-- Collapsible Inputs -->
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
                <span class="field-hint">Examples: <code>llama-3.3-70b-versatile</code>, <code>llama3-8b-8192</code>, or <code>mixtral-8x7b-32768</code></span>
              </div>

              <div class="info-note">
                Get your free Groq API key at <a href="https://console.groq.com/keys" target="_blank" class="link-btn">console.groq.com</a>.
              </div>
            </div>
          </div>

          <!-- Section: Typst Engine -->
          <div class="flat-group">
            <h3 class="group-title">
              <FileCheck :size="15" />
              <span>Typst Compiler Engine</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Compiler Status</span>
                <span class="field-sub">Check active Typst binary on your system</span>
              </div>
              <button class="action-btn" @click="checkTypst" :disabled="isCheckingTypst">
                <RefreshCw :size="13" :class="{ spin: isCheckingTypst }" />
                <span>Check Engine Status</span>
              </button>
            </div>

            <!-- Renderer Mode Selector (CLI vs WASM In-Memory) -->
            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Preview Renderer Engine</span>
                <span class="field-sub">Select the compilation engine used for live document preview</span>
              </div>
              <div class="select-wrapper">
                <select v-model="compilerSettings.rendererMode" class="custom-select-input">
                  <option value="cli">Native Typst Binary (CLI)</option>
                  <option value="wasm">Typst WASM (In-Memory Buffer)</option>
                </select>
              </div>
            </div>

            <div class="renderer-hint-box">
              <span v-if="compilerSettings.rendererMode === 'wasm'">
                <strong>Typst WASM Mode:</strong> Documents are rendered directly in memory (zero disk write). Keeps your SSD clean and avoids temporary files in <code>.gld_temp/</code>.
              </span>
              <span v-else>
                <strong>Native CLI Mode:</strong> Uses the system or bundled <code>typst</code> executable binary to render pages to disk.
              </span>
            </div>

            <div v-if="typstStatus" class="status-banner" :class="{ installed: typstStatus.installed }">
              <div class="banner-icon">
                <CheckCircle2 v-if="typstStatus.installed" :size="16" />
                <AlertCircle v-else :size="16" />
              </div>
              <div class="banner-text">
                <span class="banner-title">
                  {{ typstStatus.installed ? 'Typst Engine Active' : 'Typst Not Installed' }}
                </span>
                <span class="banner-sub">
                  {{ typstStatus.version || 'Using WASM Compiler Fallback' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ℹ️ ABOUT & UPDATES TAB -->
        <div v-else-if="activeTab === 'about'" class="tab-content">
          <div class="section-header">
            <h2>About Glide</h2>
            <p class="section-desc">Version information and software updates from GitHub.</p>
          </div>

          <!-- Section: Software Update -->
          <div class="flat-group">
            <h3 class="group-title">
              <Download :size="15" />
              <span>Software Updates</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Check for Updates</span>
                <span class="field-sub">Check for new releases on GitHub (LetterDmogus/Glide)</span>
              </div>
              <button class="action-btn" @click="checkForUpdates" :disabled="isCheckingUpdate">
                <RefreshCw :size="13" :class="{ spin: isCheckingUpdate }" />
                <span>{{ isCheckingUpdate ? 'Checking...' : 'Check for Updates' }}</span>
              </button>
            </div>

            <!-- Update Status Result Box -->
            <div v-if="updateResult" class="update-result-card" :class="{ 'update-available': updateResult.isUpdateAvailable }">
              <div class="update-card-header">
                <div class="update-card-badge" :class="updateResult.isUpdateAvailable ? 'badge-new' : 'badge-latest'">
                  <CheckCircle2 v-if="!updateResult.isUpdateAvailable && updateResult.success" :size="14" />
                  <Sparkles v-else-if="updateResult.isUpdateAvailable" :size="14" />
                  <AlertCircle v-else :size="14" />
                  <span>
                    {{ 
                      !updateResult.success 
                        ? 'Check Failed' 
                        : updateResult.isUpdateAvailable 
                          ? `New Version Available: ${updateResult.latestVersion}` 
                          : 'You are on the latest version' 
                    }}
                  </span>
                </div>
                <span class="update-version-label">
                  Current: v{{ updateResult.currentVersion || '2.1.0' }}
                </span>
              </div>

              <!-- Release Notes preview if update available -->
              <div v-if="updateResult.isUpdateAvailable" class="update-body">
                <div class="release-title">{{ updateResult.releaseName }}</div>
                <div v-if="updateResult.releaseNotes" class="release-notes-box custom-scroll">
                  {{ updateResult.releaseNotes }}
                </div>
                <button class="download-btn" @click="openReleaseUrl(updateResult.releaseUrl)">
                  <ExternalLink :size="14" />
                  <span>View Release & Download on GitHub</span>
                </button>
              </div>

              <div v-else-if="!updateResult.success" class="update-error-text">
                {{ updateResult.error }}
              </div>
            </div>
          </div>

          <!-- Section: App Info -->
          <div class="flat-group">
            <h3 class="group-title">
              <Info :size="15" />
              <span>Application Details</span>
            </h3>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">Glide App</span>
                <span class="field-sub">Modern Academic Report Editor & Compiler Powered by Typst</span>
              </div>
              <span class="info-badge">v{{ appVersion }}</span>
            </div>

            <div class="flat-row">
              <div class="field-info">
                <span class="field-label">GitHub Repository</span>
                <span class="field-sub">Open source project repository</span>
              </div>
              <button class="link-action-btn" @click="openReleaseUrl('https://github.com/LetterDmogus/Glide')">
                <ExternalLink :size="13" />
                <span>LetterDmogus/Glide</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

.settings-topbar {
  height: 48px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--bg-surface);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
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
  background: var(--bg-hover);
  color: var(--text-primary);
}

.topbar-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.settings-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-sidebar {
  width: 220px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
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
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

.settings-main {
  flex: 1;
  padding: 36px 48px;
  overflow-y: auto;
}

.tab-content {
  max-width: 620px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-header {
  margin-bottom: 8px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: var(--text-primary);
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* Flat Cardless Groups */
.flat-group {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
  padding-bottom: 24px;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
}

.flat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.flat-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.field-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}

.num-input {
  width: 76px;
  padding: 5px 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
}

.color-picker {
  width: 40px;
  height: 26px;
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

/* AI Config Box */
.ai-config-box {
  margin-top: 14px;
  padding: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
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
  font-weight: 600;
  color: var(--text-secondary);
}

.text-input {
  width: 100%;
  padding: 7px 10px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
}

.field-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.info-note {
  font-size: 11.5px;
  color: var(--text-muted);
}

.renderer-hint-box {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-primary); /* Lebih terang & jelas dibaca */
}

.renderer-hint-box strong {
  color: var(--accent);
}

.select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--text-secondary);
  pointer-events: none;
}

.custom-select-input {
  appearance: none;
  -webkit-appearance: none;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 32px 6px 12px;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
  min-width: 220px;
}

.custom-select-input:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover, rgba(255, 255, 255, 0.2));
}

.custom-select-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.custom-select-input option {
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 6px 10px;
}

.link-btn {
  color: var(--accent);
  text-decoration: none;
}

/* Status Banner */
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.status-banner {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 8px;
  color: var(--error);
}

.status-banner.installed {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.2);
  color: var(--success);
}

.banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.banner-title {
  font-size: 13px;
  font-weight: 600;
}

.banner-sub {
  font-size: 11.5px;
  opacity: 0.8;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── About & Updates Tab Styles ── */
.update-result-card {
  margin-top: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.update-result-card.update-available {
  border-color: rgba(124, 106, 247, 0.4);
  background: rgba(124, 106, 247, 0.04);
}

.update-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.update-card-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}

.update-card-badge.badge-new {
  color: var(--accent);
}

.update-card-badge.badge-latest {
  color: var(--success);
}

.update-version-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.update-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.release-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.release-notes-box {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: inherit;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 8px 14px;
  background: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.download-btn:hover {
  opacity: 0.9;
}

.update-error-text {
  font-size: 12px;
  color: var(--error);
}

.info-badge {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 4px;
  color: var(--accent);
  font-weight: 600;
}

.link-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.link-action-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
</style>
