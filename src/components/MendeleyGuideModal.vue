<script setup lang="ts">
import { X, CheckCircle2, BookOpen, Layers } from 'lucide-vue-next'

defineEmits<{
  'close': []
}>()
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container mendeley-modal">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-title">
          <BookOpen :size="20" class="icon-accent" />
          <h2>Panduan Integrasi Mendeley</h2>
        </div>
        <button class="close-btn" @click="$emit('close')" title="Tutup (Esc)">
          <X :size="18" />
        </button>
      </div>

      <!-- Body Content (Rich Rendered Styled HTML) -->
      <div class="modal-body custom-scroll">
        <div class="guide-intro">
          <p>
            Glide 2.0 mendukung <strong>BibTeX Auto-Sync</strong> dari Mendeley Reference Manager & Mendeley Desktop.
            Setiap kali Anda menambah/merevisi jurnal di Mendeley, sitasi di Glide 2.0 akan <strong>otomatis ter-update secara real-time</strong>.
          </p>
        </div>

        <!-- Step 1 -->
        <div class="guide-step">
          <div class="step-badge">1</div>
          <div class="step-content">
            <h3>Aktifkan Sync di Mendeley</h3>
            <ol>
              <li>Buka aplikasi <strong>Mendeley Reference Manager</strong> atau <strong>Mendeley Desktop</strong>.</li>
              <li>Masuk ke menu <strong>Tools ➔ Options</strong> (atau <strong>Preferences</strong> di macOS).</li>
              <li>Klik tab <strong>BibTeX</strong>.</li>
              <li>Centang <strong>"Enable BibTeX Syncing"</strong>.</li>
              <li>Pilih opsi <strong>"Create one BibTeX file for my whole library"</strong>.</li>
              <li>Tentukan folder tujuan ke <strong>folder proyek Glide 2.0 Anda</strong> dan beri nama file:
                <code>bibliography.bib</code>
              </li>
            </ol>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="guide-step">
          <div class="step-badge">2</div>
          <div class="step-content">
            <h3>Panggil Sitasi di Dokumen Typst</h3>
            <p>Buka file bab dokumen Anda (<code>.typ</code>), lalu panggil sitasi menggunakan <strong>Citation Key</strong> dari Mendeley:</p>
            
            <div class="code-block">
              <pre><code>Menurut penelitian terbaru @smith2023, metode ini meningkatkan efisiensi...</code></pre>
            </div>

            <p>Pada bagian paling bawah dokumen (atau di file bibliografi), panggil helper bibliografi:</p>
            <div class="code-block">
              <pre><code>#glide-bib("bibliography.bib")</code></pre>
            </div>
          </div>
        </div>

        <!-- Features Grid -->
        <div class="guide-features">
          <div class="feature-card">
            <CheckCircle2 :size="18" class="icon-success" />
            <div>
              <h4>Otomatis & Real-Time</h4>
              <p>Daftar pustaka langsung ter-update saat jurnal ditambahkan di Mendeley.</p>
            </div>
          </div>
          <div class="feature-card">
            <Layers :size="18" class="icon-accent" />
            <div>
              <h4>Format Standar Kampus</h4>
              <p>Mendukung format APA 7th, IEEE, Harvard, MLA, dan Van Couver.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-primary" @click="$emit('close')">Saya Mengerti</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container.mendeley-modal {
  background: #161822;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  width: 600px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #f8fafc;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.guide-intro {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--accent);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #e2e8f0;
}

.guide-step {
  display: flex;
  gap: 14px;
}

.step-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.step-content {
  flex: 1;
}

.step-content h3 {
  font-size: 15px;
  margin: 0 0 8px 0;
  color: #f1f5f9;
}

.step-content ol {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
}

.step-content code {
  background: #0f111a;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent);
  font-family: monospace;
}

.code-block {
  background: #0f111a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px 14px;
  margin: 8px 0;
}

.code-block pre {
  margin: 0;
}

.code-block code {
  color: var(--accent);
  font-family: Consolas, monospace;
  font-size: 12.5px;
}

.guide-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.feature-card h4 {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #f1f5f9;
}

.feature-card p {
  margin: 0;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.4;
}

.icon-accent { color: var(--accent); }
.icon-success { color: #10b981; }

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-primary:hover {
  filter: brightness(1.1);
}
</style>
