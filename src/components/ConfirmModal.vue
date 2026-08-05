<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { AlertCircle, HelpCircle, CheckCircle, Info, X } from 'lucide-vue-next'

withDefaults(defineProps<{
  title?: string
  message: string
  type?: 'confirm' | 'alert' | 'success' | 'error'
  confirmText?: string
  cancelText?: string
}>(), {
  title: 'Konfirmasi',
  type: 'confirm',
  confirmText: 'Ya',
  cancelText: 'Batal'
})

const emit = defineEmits<{
  'confirm': []
  'cancel': []
}>()

const confirmBtnRef = ref<HTMLButtonElement | null>(null)

onMounted(() => {
  nextTick(() => {
    confirmBtnRef.value?.focus()
  })
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-card" @click.stop>
      <div class="modal-header">
        <div class="modal-title">
          <CheckCircle v-if="type === 'success'" :size="18" class="icon success" />
          <AlertCircle v-else-if="type === 'error'" :size="18" class="icon error" />
          <HelpCircle v-else-if="type === 'confirm'" :size="18" class="icon confirm" />
          <Info v-else :size="18" class="icon info" />
          <h3>{{ title }}</h3>
        </div>
        <button class="close-btn" @click="emit('cancel')">
          <X :size="15" />
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-message">{{ message }}</p>
      </div>

      <div class="modal-footer">
        <button 
          v-if="type === 'confirm'" 
          class="btn-cancel" 
          @click="emit('cancel')"
        >
          {{ cancelText }}
        </button>
        <button 
          ref="confirmBtnRef" 
          class="btn-confirm" 
          :class="type"
          @click="emit('confirm')"
        >
          {{ type === 'confirm' ? confirmText : 'OK' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popIn 0.12s var(--ease-out);
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.icon.success { color: var(--success); }
.icon.error { color: var(--error); }
.icon.confirm { color: var(--accent); }
.icon.info { color: #3b82f6; }

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.modal-body {
  padding: 18px 16px;
}

.modal-message {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-base);
  border-top: 1px solid var(--border);
}

.btn-cancel {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-confirm {
  padding: 6px 16px;
  background: var(--accent);
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-confirm:hover {
  opacity: 0.9;
}

.btn-confirm.error {
  background: var(--error);
}
</style>
