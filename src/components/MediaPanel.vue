<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  filePath: string
}>()

const zoom = ref(1)

const mediaType = computed(() => {
  const lower = props.filePath.toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some(ext => lower.endsWith(ext))) {
    return 'image'
  }
  if (['.mp4', '.webm', '.ogg', '.mov'].some(ext => lower.endsWith(ext))) {
    return 'video'
  }
  if (['.mp3', '.wav', '.ogg', '.aac', '.flac'].some(ext => lower.endsWith(ext))) {
    return 'audio'
  }
  if (lower.endsWith('.pdf')) {
    return 'pdf'
  }
  return 'unknown'
})

// Electron file protocol url conversion
const fileUrl = computed(() => {
  if (!props.filePath) return ''
  // Standardize backslashes to forward slashes
  let cleanPath = props.filePath.replace(/\\/g, '/')
  // Ensure leading slash for Windows drive letters (C:/ -> /C:/)
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath
  }
  return `file://${cleanPath}`
})

watch(() => props.filePath, () => {
  zoom.value = 1
})

const handleZoomIn = () => zoom.value = Math.min(zoom.value + 0.25, 4)
const handleZoomOut = () => zoom.value = Math.max(zoom.value - 0.25, 0.25)
const resetZoom = () => zoom.value = 1
</script>

<template>
  <div class="media-panel">
    <div class="media-header">
      <span class="file-path truncate">{{ filePath }}</span>
      <div v-if="mediaType === 'image'" class="controls">
        <button class="ctrl-btn-sm" @click="handleZoomOut" title="Zoom Out">
          <ZoomOut :size="12" />
        </button>
        <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
        <button class="ctrl-btn-sm" @click="handleZoomIn" title="Zoom In">
          <ZoomIn :size="12" />
        </button>
        <button class="ctrl-btn-sm" @click="resetZoom" title="Reset Zoom">
          <RotateCcw :size="12" />
        </button>
      </div>
    </div>

    <div class="media-content">
      <!-- Image Viewer -->
      <div v-if="mediaType === 'image'" class="image-wrapper">
        <img 
          :src="fileUrl" 
          :style="{ transform: `scale(${zoom})` }"
          alt="Media preview" 
        />
      </div>

      <!-- Video Viewer -->
      <div v-else-if="mediaType === 'video'" class="video-wrapper">
        <video controls :src="fileUrl"></video>
      </div>

      <!-- Audio Viewer -->
      <div v-else-if="mediaType === 'audio'" class="audio-wrapper">
        <audio controls :src="fileUrl"></audio>
      </div>

      <!-- PDF Viewer -->
      <div v-else-if="mediaType === 'pdf'" class="pdf-wrapper">
        <iframe :src="fileUrl" class="pdf-frame" title="PDF Preview"></iframe>
      </div>

      <!-- Fallback -->
      <div v-else class="unknown-wrapper">
        <p>File format tidak didukung untuk preview media.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--bg-base);
  color: var(--text-primary);
  overflow: hidden;
}

.media-header {
  height: 32px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.file-path {
  color: var(--text-secondary);
  max-width: 60%;
}

.controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ctrl-btn-sm {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 3px 6px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.ctrl-btn-sm:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.zoom-level {
  font-size: 11px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}

.media-content {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
  max-width: 100%;
  max-height: 100%;
}

.image-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  border-radius: 4px;
}

.video-wrapper video {
  max-width: 90%;
  max-height: 90%;
  outline: none;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.audio-wrapper audio {
  width: 350px;
}

.pdf-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #282c34;
}

.unknown-wrapper {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
