<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { 
  FolderOpen, PlusCircle, Trash2,
} from 'lucide-vue-next'

export interface RecentProject {
  path: string
  name: string
  lastOpened: number
  isGlide: boolean
}

const emit = defineEmits<{
  'open-folder': []
  'open-project-path': [path: string]
  'create-project': []
}>()

const recents = ref<RecentProject[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number | null = null

function loadRecents() {
  try {
    const raw = localStorage.getItem('glide_recent_projects')
    if (raw) {
      recents.value = JSON.parse(raw)
    }
  } catch {
    recents.value = []
  }
}

function removeRecent(path: string, e: Event) {
  e.stopPropagation()
  recents.value = recents.value.filter(r => r.path !== path)
  localStorage.setItem('glide_recent_projects', JSON.stringify(recents.value))
}

// ── Highly Optimized Canvas Star Rain Animation ──────────────────
interface Star {
  x: number
  y: number
  length: number
  speed: number
  opacity: number
  width: number
}

function initStarRain() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = (canvas.width = canvas.parentElement?.clientWidth || 800)
  let height = (canvas.height = 240)

  const stars: Star[] = []
  const maxStars = 45

  for (let i = 0; i < maxStars; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 25 + 30,
      speed: Math.random() * 1.5 + 0.8,
      opacity: Math.random() * 0.7 + 0.3,
      width: Math.random() * 1.2 + 0.6
    })
  }

  function render() {
    ctx!.clearRect(0, 0, width, height)

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      s.y += s.speed
      s.x += s.speed * 0.5

      if (s.y > height || s.x > width + 50) {
        s.y = -s.length
        s.x = Math.random() * (width + 200) - 100
      }

      // Smooth Fade-out saat mendekati batas bawah canvas (fade out mulai dari 60% height)
      let fadeFactor = 1
      if (s.y > height * 0.6) {
        fadeFactor = Math.max(0, 1 - (s.y - height * 0.6) / (height * 0.4))
      }

      const currentOpacity = s.opacity * fadeFactor
      if (currentOpacity <= 0.01) continue

      // Sudut miring konsisten meluncur ke kanan bawah
      const tailX = s.x - s.length * 0.4
      const tailY = s.y - s.length * 0.9

      const grad = ctx!.createLinearGradient(s.x, s.y, tailX, tailY)
      grad.addColorStop(0, `rgba(167, 139, 250, ${currentOpacity})`)
      grad.addColorStop(1, 'rgba(124, 106, 247, 0)')

      ctx!.beginPath()
      ctx!.strokeStyle = grad
      ctx!.lineWidth = s.width
      ctx!.moveTo(s.x, s.y)
      ctx!.lineTo(tailX, tailY)
      ctx!.stroke()
    }

    animId = requestAnimationFrame(render)
  }

  const handleResize = () => {
    if (!canvas || !canvas.parentElement) return
    width = canvas.width = canvas.parentElement.clientWidth
  }
  window.addEventListener('resize', handleResize)

  render()
}

onMounted(() => {
  loadRecents()
  initStarRain()
})

onBeforeUnmount(() => {
  if (animId) cancelAnimationFrame(animId)
})
</script>

<template>
  <div class="welcome">
    <div class="hero-canvas-wrapper">
      <canvas ref="canvasRef" class="star-canvas"></canvas>
    </div>

    <div class="welcome-container">
      <div class="welcome-header">
        <h1 class="app-name">Glide</h1>
        <span class="sub-text">Version 2.1</span>
      </div>
      <div class="sub-container">
        <span class="sub-text">Aplikasi ini masih pada fase pengembangan, ekspetasi akan ada banyak bug. Jika kamu menemukan bug atau memiliki saran pengembangan, silahkan contact email floatycandy@gmail.com. Kontribusi kamu sangat beharga, terima kasih!</span>
      </div>

      <div class="section-block">
        <h2 class="section-heading">Start</h2>
        <div class="start-links">
          <button class="link-btn" @click="emit('create-project')">
            <PlusCircle :size="18" class="link-icon" />
            <span>New GLD Project...</span>
          </button>
          <button class="link-btn" @click="emit('open-folder')">
            <FolderOpen :size="18" class="link-icon" />
            <span>Open Folder...</span>
          </button>
        </div>
      </div>

      <!-- Recent Section (Style Lama) -->
      <div class="section-block">
        <h2 class="section-heading">Recent</h2>
        <div v-if="recents.length > 0" class="recent-links">
          <div 
            v-for="item in recents" 
            :key="item.path" 
            class="recent-row"
            @click="emit('open-project-path', item.path)"
          >
            <div class="recent-left">
              <span class="recent-title">{{ item.name }}</span>
              <span class="recent-path">{{ item.path }}</span>
            </div>
            <button 
              class="btn-delete" 
              @click="removeRecent(item.path, $event)" 
              title="Hapus dari riwayat"
            >
              <Trash2 :size="13" />
            </button>
          </div>
        </div>

        <div v-else class="recent-empty">
          <span>You have no recent folders, <a href="#" @click.prevent="emit('open-folder')">open a folder</a> to start.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  flex: 1;
  height: 100%;
  background: var(--bg-base);
  color: #cccccc;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 60px 80px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  position: relative;
}

.hero-canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 130px;
  background: linear-gradient(180deg, #06070b 0%, rgba(15, 17, 23, 0) 100%);
  pointer-events: none;
  z-index: 5;
}

.star-canvas {
  width: 100%;
  height: 100%;
  opacity: 1;
}

.welcome-container {
  max-width: 560px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  z-index: 1;
}

.sub-container {
  padding-bottom: 16px;
}

/* Header (Style Asli) */
.welcome-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-name {
  font-size: 32px;
  font-weight: 300;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.02em;
}

.sub-text {
  font-size: 14px;
  color: #858585;
}

/* Section Block (Style Asli) */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-heading {
  font-size: 22px;
  font-weight: 300;
  color: #e7e7e7;
  margin: 0;
}

/* Start Links (Style Asli) */
.start-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s;
}

.link-btn:hover {
  color: var(--accent);
  text-decoration: underline;
}

.link-icon {
  color: var(--accent);
  flex-shrink: 0;
}

/* Recent Links (Style Asli) */
.recent-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.recent-row:hover {
  background: #2a2d2e;
}

.recent-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  overflow: hidden;
}

.recent-title {
  font-size: 13px;
  color: var(--accent);
  font-weight: 400;
  white-space: nowrap;
}

.recent-row:hover .recent-title {
  text-decoration: underline;
}

.recent-path {
  font-size: 11px;
  color: #858585;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-delete {
  background: transparent;
  border: none;
  color: #858585;
  cursor: pointer;
  opacity: 0;
  padding: 2px 4px;
  border-radius: 3px;
  transition: opacity 0.15s, color 0.15s;
}

.recent-row:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: #f87171;
  background: rgba(255,255,255,0.1);
}

.recent-empty {
  font-size: 13px;
  color: #858585;
}

.recent-empty a {
  color: var(--accent);
  text-decoration: none;
}

.recent-empty a:hover {
  text-decoration: underline;
}
</style>
