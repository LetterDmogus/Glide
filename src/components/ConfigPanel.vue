<script setup lang="ts">
import { ref } from 'vue'
import { Settings, Save } from 'lucide-vue-next'
import type { GlideConfig } from '../electron.d'

const props = defineProps<{
  config: GlideConfig
}>()

const emit = defineEmits<{
  'save': [config: GlideConfig]
}>()

const formConfig = ref<GlideConfig>({ ...props.config })

function handleSave() {
  emit('save', formConfig.value)
}
</script>

<template>
  <div class="config-panel">
    <div class="config-header">
      <div class="header-title">
        <Settings :size="16" />
        <span>Project Configuration (glide.yaml)</span>
      </div>
      <button class="save-btn" @click="handleSave">
        <Save :size="14" />
        Simpan Konfigurasi
      </button>
    </div>

    <div class="config-body">
      <!-- General Meta -->
      <div class="section-group">
        <h3>Informasi Umum</h3>
        <div class="field-row">
          <label>Judul Dokumen</label>
          <input type="text" v-model="formConfig.title" />
        </div>
        <div class="field-row">
          <label>Penulis / Penyusun</label>
          <input type="text" v-model="formConfig.author" />
        </div>
      </div>

      <!-- Layout & Margins -->
      <div class="section-group">
        <h3>Margin Halaman (Formal Indonesia)</h3>
        <div class="field-grid">
          <div class="field-row">
            <label>Margin Left (Kiri)</label>
            <input type="text" v-model="formConfig.margin_left" placeholder="4cm" />
          </div>
          <div class="field-row">
            <label>Margin Right (Kanan)</label>
            <input type="text" v-model="formConfig.margin_right" placeholder="3cm" />
          </div>
          <div class="field-row">
            <label>Margin Top (Atas)</label>
            <input type="text" v-model="formConfig.margin_top" placeholder="3cm" />
          </div>
          <div class="field-row">
            <label>Margin Bottom (Bawah)</label>
            <input type="text" v-model="formConfig.margin_bottom" placeholder="3cm" />
          </div>
        </div>
      </div>

      <!-- Typography -->
      <div class="section-group">
        <h3>Tipografi</h3>
        <div class="field-grid">
          <div class="field-row">
            <label>Font Family</label>
            <input type="text" v-model="formConfig.font_family" placeholder="'Times New Roman', serif" />
          </div>
          <div class="field-row">
            <label>Font Size</label>
            <input type="text" v-model="formConfig.font_size" placeholder="12pt" />
          </div>
          <div class="field-row">
            <label>Line Spacing</label>
            <input type="number" step="0.1" v-model="formConfig.line_spacing" placeholder="1.5" />
          </div>
          <div class="field-row">
            <label>Text Align</label>
            <select v-model="formConfig.text_align">
              <option value="justify">Justify</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  color: var(--text-primary);
  overflow-y: auto;
}
.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}
.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: opacity 0.15s;
}
.save-btn:hover { opacity: 0.9; }

.config-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
}
.section-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-surface);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.section-group h3 {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 4px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
label {
  font-size: 11px;
  color: var(--text-secondary);
}
input, select {
  padding: 8px 12px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
input:focus, select:focus {
  border-color: var(--border-focus);
}
</style>
