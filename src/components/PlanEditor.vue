<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FileText, Edit3, Eye, } from 'lucide-vue-next'

const props = defineProps<{
  filePath: string
  content: string
}>()

const emit = defineEmits<{
  'change': [content: string]
  'save': [content: string]
  'open-file': [filePath: string]
}>()

const mode = ref<'preview' | 'split' | 'edit'>('preview')
const rawContent = ref(props.content)

watch(() => props.content, (newVal) => {
  if (newVal !== rawContent.value) {
    rawContent.value = newVal
  }
})

function handleInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  rawContent.value = val
  emit('change', val)
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    emit('save', rawContent.value)
  }
}

function toggleCheckbox(lineIndex: number) {
  const lines = rawContent.value.split('\n')
  if (lines[lineIndex]) {
    if (lines[lineIndex].includes('- [ ]')) {
      lines[lineIndex] = lines[lineIndex].replace('- [ ]', '- [x]')
    } else if (lines[lineIndex].includes('- [x]')) {
      lines[lineIndex] = lines[lineIndex].replace('- [x]', '- [ ]')
    }
    const next = lines.join('\n')
    rawContent.value = next
    emit('change', next)
    emit('save', next)
  }
}

// Simple Parser Markdown ala Obsidian (Heading, Table, Tasklist, Wiki-Link [[file.typ]])
interface ParsedLine {
  type: 'h1' | 'h2' | 'h3' | 'task' | 'table-block' | 'quote' | 'hr' | 'p'
  content: string
  checked?: boolean
  lineIdx: number
  headers?: string[]
  rows?: string[][]
}

const parsedMarkdown = computed(() => {
  const lines = rawContent.value.split('\n')
  const result: ParsedLine[] = []
  let currentTable: ParsedLine | null = null

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    // Markdown Table Detection (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.includes('---')) {
        // Line pemisah header | --- | --- |
        return
      }
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim())
      if (!currentTable) {
        currentTable = {
          type: 'table-block',
          content: '',
          headers: cells,
          rows: [],
          lineIdx: idx
        }
        result.push(currentTable)
      } else {
        currentTable.rows?.push(cells)
      }
      return
    } else {
      currentTable = null
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      result.push({ type: 'hr', content: '', lineIdx: idx })
      return
    }

    // Headings
    if (line.startsWith('# ')) {
      result.push({ type: 'h1', content: line.slice(2), lineIdx: idx })
      return
    }
    if (line.startsWith('## ')) {
      result.push({ type: 'h2', content: line.slice(3), lineIdx: idx })
      return
    }
    if (line.startsWith('### ')) {
      result.push({ type: 'h3', content: line.slice(4), lineIdx: idx })
      return
    }

    // Blockquote
    if (line.startsWith('> ')) {
      result.push({ type: 'quote', content: line.slice(2), lineIdx: idx })
      return
    }

    // Task List (- [ ] atau - [x])
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
      const isChecked = trimmed.startsWith('- [x]')
      const text = trimmed.slice(5).trim()
      result.push({ type: 'task', content: text, checked: isChecked, lineIdx: idx })
      return
    }

    // Paragraph biasa
    result.push({ type: 'p', content: line, lineIdx: idx })
  })

  return result
})

function formatText(text: string): string {
  if (!text) return ''
  // Bold **text**
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
  // Code `code`
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
  return formatted
}

// Parse Obsidian Wiki-Links [[sections/01-pendahuluan.typ]]
function parseWikiLinks(text: string) {
  const parts = []
  const regex = /\[\[(.*?)\]\]/g
  let lastIdx = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', value: text.slice(lastIdx, match.index) })
    }
    parts.push({ type: 'link', value: match[1] })
    lastIdx = regex.lastIndex
  }
  if (lastIdx < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIdx) })
  }
  return parts
}
</script>

<template>
  <div class="plan-editor-container">
    <!-- Header Control Bar -->
    <div class="plan-header">
      <div class="header-modes">
        <button 
          class="mode-btn" 
          :class="{ active: mode === 'preview' }" 
          @click="mode = 'preview'"
          title="Tampilan Visual Interaktif"
        >
          <Eye :size="13" />
          <span>Visual Plan</span>
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: mode === 'split' }" 
          @click="mode = 'split'"
          title="Tampilan Split Code & Visual"
        >
          <FileText :size="13" />
          <span>Split</span>
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: mode === 'edit' }" 
          @click="mode = 'edit'"
          title="Edit Raw Markdown"
        >
          <Edit3 :size="13" />
          <span>Raw Code</span>
        </button>
      </div>
    </div>

    <!-- Body Area -->
    <div class="plan-body" :class="mode">
      <!-- Raw Markdown Editor -->
      <div v-if="mode === 'edit' || mode === 'split'" class="raw-editor-pane">
        <textarea
          :value="rawContent"
          @input="handleInput"
          @keydown="handleKeydown"
          class="raw-textarea custom-scroll"
          placeholder="Tuliskan planning dokumen, catatan bab, atau tasklist di sini..."
        ></textarea>
      </div>

      <!-- Obsidian-style Interactive Visual Render Pane -->
      <div v-if="mode === 'preview' || mode === 'split'" class="visual-pane custom-scroll">
        <div class="obsidian-render">
          <template v-for="(item, i) in parsedMarkdown" :key="i">
            <!-- Headings -->
            <h1 v-if="item.type === 'h1'" class="obsidian-h1">
              <template v-for="(p, pIdx) in parseWikiLinks(item.content)" :key="pIdx">
                <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                  📄 {{ p.value }}
                </a>
              </template>
            </h1>

            <h2 v-else-if="item.type === 'h2'" class="obsidian-h2">
              <template v-for="(p, pIdx) in parseWikiLinks(item.content)" :key="pIdx">
                <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                  📄 {{ p.value }}
                </a>
              </template>
            </h2>

            <h3 v-else-if="item.type === 'h3'" class="obsidian-h3">
              <template v-for="(p, pIdx) in parseWikiLinks(item.content)" :key="pIdx">
                <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                  📄 {{ p.value }}
                </a>
              </template>
            </h3>

            <!-- Task List Checkbox -->
            <div v-else-if="item.type === 'task'" class="obsidian-task" @click="toggleCheckbox(item.lineIdx)">
              <input type="checkbox" :checked="item.checked" class="task-checkbox" readonly />
              <span class="task-text" :class="{ completed: item.checked }">
                <template v-for="(p, pIdx) in parseWikiLinks(item.content)" :key="pIdx">
                  <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                  <a v-else-if="p.type === 'link'" class="wiki-link" @click.stop="emit('open-file', p.value)">
                    📄 {{ p.value }}
                  </a>
                </template>
              </span>
            </div>

            <!-- Blockquote -->
            <blockquote v-else-if="item.type === 'quote'" class="obsidian-quote">
              <template v-for="(p, pIdx) in parseWikiLinks(item.content)" :key="pIdx">
                <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                  📄 {{ p.value }}
                </a>
              </template>
            </blockquote>

            <!-- Unified Markdown Table -->
            <table v-else-if="item.type === 'table-block'" class="obsidian-table">
              <thead>
                <tr>
                  <th v-for="(cell, cIdx) in item.headers" :key="cIdx">
                    <template v-for="(p, pIdx) in parseWikiLinks(cell)" :key="pIdx">
                      <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                      <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                        📄 {{ p.value }}
                      </a>
                    </template>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rIdx) in item.rows" :key="rIdx">
                  <td v-for="(cell, cIdx) in row" :key="cIdx">
                    <template v-for="(p, pIdx) in parseWikiLinks(cell)" :key="pIdx">
                      <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                      <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                        📄 {{ p.value }}
                      </a>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- HR -->
            <hr v-else-if="item.type === 'hr'" class="obsidian-hr" />

            <!-- Paragraph / Text -->
            <p v-else-if="item.content.trim()" class="obsidian-p">
              <template v-for="(p, pIdx) in parseWikiLinks(item.content)" :key="pIdx">
                <span v-if="p.type === 'text'" v-html="formatText(p.value)"></span>
                <a v-else-if="p.type === 'link'" class="wiki-link" @click="emit('open-file', p.value)">
                  📄 {{ p.value }}
                </a>
              </template>
            </p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #11131c;
  color: #e2e8f0;
}

.plan-header {
  height: 34px;
  background: #161824;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 10px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-light);
}

.header-modes {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.mode-btn.active {
  background: var(--bg-elevated);
  border-color: var(--border-focus);
  color: #fff;
}

.plan-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.plan-body.split .raw-editor-pane,
.plan-body.split .visual-pane {
  width: 50%;
}

.raw-editor-pane {
  flex: 1;
  height: 100%;
  border-right: 1px solid var(--border);
}

.raw-textarea {
  width: 100%;
  height: 100%;
  background: #131520;
  color: #cbd5e1;
  border: none;
  padding: 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.visual-pane {
  flex: 1;
  height: 100%;
  padding: 24px 32px;
  overflow-y: auto;
  background: #0f111a;
}

.obsidian-render {
  max-width: 760px;
  margin: 0 auto;
  line-height: 1.7;
}

.obsidian-h1 {
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
  margin-top: 16px;
  margin-bottom: 16px;
}

.obsidian-h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-light);
  margin-top: 20px;
  margin-bottom: 12px;
}

.obsidian-h3 {
  font-size: 15px;
  font-weight: 600;
  color: #cbd5e1;
  margin-top: 16px;
  margin-bottom: 8px;
}

.obsidian-p {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 10px;
}

.obsidian-task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.obsidian-task:hover {
  background: rgba(255, 255, 255, 0.06);
}

.task-checkbox {
  cursor: pointer;
  accent-color: var(--accent);
}

.task-text {
  font-size: 13px;
  color: #e2e8f0;
}

.task-text.completed {
  text-decoration: line-through;
  color: #64748b;
}

.obsidian-quote {
  border-left: 3px solid var(--accent);
  background: rgba(99, 102, 241, 0.08);
  padding: 10px 14px;
  border-radius: 0 6px 6px 0;
  margin: 12px 0;
  font-size: 13px;
  color: #cbd5e1;
}

.obsidian-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 12.5px;
  background: #161824;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.obsidian-table th {
  background: rgba(255, 255, 255, 0.06);
  color: var(--accent-light);
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.obsidian-table td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
}

.obsidian-hr {
  border: none;
  border-top: 1px dashed rgba(255, 255, 255, 0.15);
  margin: 20px 0;
}

.wiki-link {
  color: var(--accent-light);
  background: rgba(99, 102, 241, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}

.wiki-link:hover {
  background: var(--accent);
  color: #fff;
}
</style>
