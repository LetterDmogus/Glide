<script setup lang="ts">
import { TerminalSquare } from 'lucide-vue-next'

const emit = defineEmits<{
  'select': [choice: 'powershell' | 'cmd' | 'gitbash']
  'close': []
}>()
</script>

<template>
  <div class="terminal-modal-overlay" @click.self="emit('close')">
    <div class="terminal-modal-card">
      <div class="terminal-modal-header">
        <TerminalSquare :size="16" class="icon-accent" />
        <h3>Choose external terminal</h3>
      </div>
      <div class="terminal-options-list">
        <button class="terminal-opt-btn" @click="emit('select', 'powershell')">
          <span class="opt-title">PowerShell</span>
          <span class="opt-sub">powershell.exe (Rekomendasi Default)</span>
        </button>
        
        <button class="terminal-opt-btn" @click="emit('select', 'cmd')">
          <span class="opt-title">Command Prompt</span>
          <span class="opt-sub">cmd.exe (Windows Standard)</span>
        </button>

        <button class="terminal-opt-btn" @click="emit('select', 'gitbash')">
          <span class="opt-title">Git Bash</span>
          <span class="opt-sub">git-bash.exe (Unix Emulation)</span>
        </button>
      </div>

      <button class="terminal-cancel-btn" @click="emit('close')">Batal</button>
    </div>
  </div>
</template>

<style scoped>
.terminal-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

.terminal-modal-card {
  width: 360px;
  max-width: 90vw;
  background: #181a26;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.terminal-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.terminal-modal-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-light);
  margin: 0;
}

.terminal-modal-desc {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

.terminal-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.terminal-opt-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.terminal-opt-btn:hover {
  background: var(--accent-soft);
  border-color: var(--border-focus);
}

.opt-title {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.opt-sub {
  font-size: 10.5px;
  color: #94a3b8;
}

.terminal-cancel-btn {
  align-self: flex-end;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.terminal-cancel-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.08);
}
</style>
