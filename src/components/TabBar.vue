<script setup lang="ts">
import { Bot, FileText } from 'lucide-vue-next'
import type { TabItem } from '../App.vue'

defineProps<{
  openTabs: TabItem[]
  activeFile?: string
}>()

const emit = defineEmits<{
  'select-tab': [tab: TabItem]
  'close-tab': [path: string, event: MouseEvent]
  'pin-tab': [tab: TabItem]
}>()
</script>

<template>
  <div class="tab-bar">
    <template v-if="openTabs.length > 0">
      <div 
        v-for="tab in openTabs" 
        :key="tab.path"
        class="tab"
        :class="{ active: activeFile === tab.path, preview: tab.isPreview, dirty: tab.isDirty }"
        @click="emit('select-tab', tab)"
        @dblclick="emit('pin-tab', tab)"
      >
        <Bot v-if="tab.isAiChat" :size="12" class="icon-accent" />
        <FileText v-else :size="12" />
        <span class="tab-title" :class="{ italic: tab.isPreview }">{{ tab.name }}</span>
        <button class="tab-close" @click="emit('close-tab', tab.path, $event)" :title="tab.isDirty ? 'Unsaved' : 'Close'">
          <span v-if="tab.isDirty" class="dirty-dot">●</span>
          <span v-else class="close-x">×</span>
        </button>
      </div>
    </template>
    <div v-else class="tab-empty">
      No open files
    </div>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  height: 35px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  flex-shrink: 0;
}
.tab-bar::-webkit-scrollbar {
  height: 3px;
}
.tab-bar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border-right: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: background 0.1s, color 0.1s;
}

.tab:hover {
  background: rgba(255,255,255,0.03);
  color: var(--text);
}

.tab.active {
  background: var(--bg-base);
  color: var(--text);
  border-top: 2px solid var(--accent);
}

.tab.preview .tab-title {
  font-style: italic;
  opacity: 0.8;
}

.tab-title {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  margin-left: 2px;
}

.tab-close:hover {
  background: rgba(255,255,255,0.15);
  color: var(--text);
}

.dirty-dot {
  font-size: 8px;
  color: var(--accent);
}

.close-x {
  font-size: 14px;
  line-height: 1;
}

.tab-empty {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 11.5px;
  color: var(--text-muted);
  font-style: italic;
}
</style>
