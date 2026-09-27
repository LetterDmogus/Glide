import { createApp } from 'vue'
import './style.css'
import './layout.css'
import './file-icons.css'
import App from './App.vue'
import ExternalPreviewApp from './ExternalPreviewApp.vue'

const urlParams = new URLSearchParams(window.location.search)
const isPreviewWindow = urlParams.get('window') === 'preview' || window.location.hash.includes('preview')

const rootComponent = isPreviewWindow ? ExternalPreviewApp : App

createApp(rootComponent).mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer?.on?.('main-process-message', (_event, message) => {
    console.log(message)
  })
})
