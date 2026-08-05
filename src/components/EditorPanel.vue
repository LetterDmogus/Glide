<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Prec } from '@codemirror/state'
import { autocompletion, closeBrackets, closeBracketsKeymap, type CompletionContext, type Completion } from '@codemirror/autocomplete'
import { markdown } from '@codemirror/lang-markdown'
import { yaml } from '@codemirror/lang-yaml'
import { typst } from 'codemirror-lang-typst'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { indentWithTab, undo, redo, selectAll } from '@codemirror/commands'
import { search, openSearchPanel, searchKeymap } from '@codemirror/search'
import { FileText } from 'lucide-vue-next'

import SymbolPalette from './SymbolPalette.vue'
import AiInlinePopup from './AiInlinePopup.vue'
import { aiSettings } from '../utils/settings'

const typstCompletions: Completion[] = [
  { label: '#set', type: 'keyword', detail: 'set rule' },
  { label: '#show', type: 'keyword', detail: 'show rule' },
  { label: '#let', type: 'keyword', detail: 'define value or function' },
  { label: '#import', type: 'keyword', detail: 'import module' },
  { label: '#include', type: 'keyword', detail: 'include file' },
  { label: '#text', type: 'function', detail: 'text styling' },
  { label: '#strong', type: 'function', detail: 'bold text' },
  { label: '#emph', type: 'function', detail: 'emphasized text' },
  { label: '#heading', type: 'function', detail: 'document heading' },
  { label: '#figure', type: 'function', detail: 'figure with caption' },
  { label: '#image', type: 'function', detail: 'insert image' },
  { label: '#table', type: 'function', detail: 'create table' },
  { label: '#grid', type: 'function', detail: 'create grid layout' },
  { label: '#stack', type: 'function', detail: 'stack content' },
  { label: '#align', type: 'function', detail: 'align content' },
  { label: '#pagebreak', type: 'function', detail: 'insert page break' },
  { label: '#linebreak', type: 'function', detail: 'insert line break' },
  { label: '#lorem', type: 'function', detail: 'placeholder text' },
  { label: 'auto', type: 'constant' },
  { label: 'none', type: 'constant' },
  { label: 'true', type: 'constant' },
  { label: 'false', type: 'constant' },
]

function typstCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/#?[A-Za-z][\w-]*/)
  if (!word && !context.explicit) return null
  return {
    from: word?.from ?? context.pos,
    options: typstCompletions,
    validFor: /#?[A-Za-z][\w-]*/
  }
}

const props = defineProps<{
  filePath?: string
  content?: string
  fontSize?: number
  lineWrapping?: boolean
}>()

const emit = defineEmits<{
  'change': [content: string]
  'save': [content: string]
}>()

const editorEl = ref<HTMLElement | null>(null)
let editorView: EditorView | null = null

// Symbol Palette state
const showSymbolPalette = ref(false)
const symbolQuery = ref('')
const palettePos = ref({ top: 0, left: 0 })
const paletteRef = ref<any>(null)

function updatePalettePosition() {
  if (!editorView) return
  const pos = editorView.state.selection.main.head
  const coords = editorView.coordsAtPos(pos)
  if (coords && editorEl.value) {
    const rect = editorEl.value.getBoundingClientRect()
    palettePos.value = {
      top: coords.bottom - rect.top + 6,
      left: Math.max(10, coords.left - rect.left)
    }
  }
}

function checkSymbolTrigger() {
  if (!editorView) return
  const state = editorView.state
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  const match = textBefore.match(/(:[a-zA-Z0-9_-]*)$/)
  if (match) {
    symbolQuery.value = match[1]
    updatePalettePosition()
    showSymbolPalette.value = true
  } else {
    showSymbolPalette.value = false
  }
}

function insertSnippet(snippet: string, triggerLength: number) {
  if (!editorView) return
  const pos = editorView.state.selection.main.head
  editorView.dispatch({
    changes: { from: pos - triggerLength, to: pos, insert: snippet },
    selection: { anchor: pos - triggerLength + snippet.length }
  })
  showSymbolPalette.value = false
  editorView.focus()
}

const glideTheme = EditorView.theme({
    '&': {
      height: '100%',
      background: 'var(--bg-base) !important',
      color: 'var(--text-primary)',
      fontSize: `${props.fontSize || 13}px`,
  },
  '.cm-scroller': { 
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    lineHeight: '1.7',
    overflow: 'auto',
    padding: '8px 0',
  },
  '.cm-content': { padding: '0 16px', minHeight: '100%' },
  '.cm-gutters': {
    background: 'var(--bg-surface) !important',
    borderRight: '1px solid var(--border)',
    color: 'var(--text-muted)',
    minWidth: '44px',
  },
  '.cm-lineNumbers .cm-gutterElement': { paddingRight: '12px', paddingLeft: '8px' },
  '.cm-activeLine': { background: 'rgba(124, 106, 247, 0.06) !important' },
  '.cm-activeLineGutter': { background: 'rgba(124, 106, 247, 0.1) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground': { background: 'rgba(124, 106, 247, 0.2) !important' },
  '.cm-focused .cm-selectionBackground': { background: 'rgba(124, 106, 247, 0.25) !important' },
  '.cm-matchingBracket': { background: 'rgba(124, 106, 247, 0.2)' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-panel.cm-search': {
    background: 'var(--bg-elevated) !important',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    padding: '6px 12px',
  },
  '.cm-panel.cm-search input': {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '12px',
    outline: 'none',
  },
  '.cm-panel.cm-search button': {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  '.cm-panel.cm-search button:hover': {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
  }
}, { dark: true })

function getLanguageExtension(path?: string) {
  if (!path) return markdown()
  const lower = path.toLowerCase()
  if (lower.endsWith('.typ')) return typst()
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return yaml()
  return markdown()
}

const showAiPopup = ref(false)
const selectedText = ref('')
const aiPopupPos = ref({ top: 0, left: 0 })

function checkAiSelection() {
  if (!aiSettings.value.enabled || !editorView) {
    showAiPopup.value = false
    return
  }

  const selection = editorView.state.selection.main
  if (selection.empty) {
    showAiPopup.value = false
    return
  }

  const text = editorView.state.sliceDoc(selection.from, selection.to).trim()
  if (!text || text.length < 3) {
    showAiPopup.value = false
    return
  }

  selectedText.value = text

  // Calculate popup position near selection with smart viewport auto-flipping
  const startCoords = editorView.coordsAtPos(selection.from)
  const endCoords = editorView.coordsAtPos(selection.to)

  if (endCoords && startCoords) {
    const parentRect = editorEl.value?.getBoundingClientRect()
    const parentHeight = parentRect?.height || 600
    const parentWidth = parentRect?.width || 800

    const bottomDistance = parentHeight - (endCoords.bottom - (parentRect?.top || 0))
    let top = endCoords.bottom - (parentRect?.top || 0) + 8

    // Jika jarak ke bawah kurang dari 220px, flip posisi ke ATAS teks yang di-select
    if (bottomDistance < 220) {
      top = Math.max(10, (startCoords.top - (parentRect?.top || 0)) - 180)
    }

    const left = Math.max(10, Math.min(endCoords.left - (parentRect?.left || 0), parentWidth - 390))
    
    aiPopupPos.value = { top: Math.max(10, top), left }
    showAiPopup.value = true
  }
}

function handleAiReplace(newText: string) {
  if (!editorView) return
  const selection = editorView.state.selection.main
  editorView.dispatch({
    changes: { from: selection.from, to: selection.to, insert: newText },
    selection: { anchor: selection.from + newText.length }
  })
  showAiPopup.value = false
}

function handleAiInsertBelow(newText: string) {
  if (!editorView) return
  const selection = editorView.state.selection.main
  const insertText = '\n\n' + newText
  editorView.dispatch({
    changes: { from: selection.to, insert: insertText },
    selection: { anchor: selection.to + insertText.length }
  })
  showAiPopup.value = false
}

function buildState(content: string, path?: string) {
  return EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      oneDark,
      glideTheme,
      // Wrap long lines visually without changing the document content.
      ...(props.lineWrapping !== false ? [EditorView.lineWrapping] : []),
      closeBrackets(),
      autocompletion({ override: [typstCompletionSource] }),
      search({ top: true }),
      getLanguageExtension(path),
      keymap.of([indentWithTab, ...closeBracketsKeymap, ...searchKeymap]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          emit('change', update.state.doc.toString())
        }
        if (update.docChanged || update.selectionSet) {
          nextTick(checkSymbolTrigger)
          nextTick(checkAiSelection)
        }
      }),
      Prec.highest(EditorView.domEventHandlers({
        keydown(e) {
          if (showSymbolPalette.value && paletteRef.value) {
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
              e.preventDefault()
              e.stopPropagation()
              paletteRef.value.handleKeyDown(e)
              return true
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault()
            if (editorView) emit('save', editorView.state.doc.toString())
          }
        }
      }))
    ]
  })
}

function initEditor() {
  if (!editorEl.value || !props.filePath) {
    if (editorView) {
      editorView.destroy()
      editorView = null
    }
    return
  }
  if (editorView) editorView.destroy()
  editorView = new EditorView({
    state: buildState(props.content || '', props.filePath),
    parent: editorEl.value
  })
}

// Expose editor actions ke parent component (TitleBar menu)
function triggerUndo() { if (editorView) undo(editorView) }
function triggerRedo() { if (editorView) redo(editorView) }
function triggerSelectAll() { if (editorView) selectAll(editorView) }
function triggerFind() { if (editorView) openSearchPanel(editorView) }

defineExpose({
  triggerUndo,
  triggerRedo,
  triggerSelectAll,
  triggerFind
})

onMounted(() => nextTick(initEditor))
onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})

watch(() => props.filePath, (newPath) => {
  // flush: sync ensures this runs BEFORE Vue updates the DOM
  if (!newPath) {
    if (editorView) {
      editorView.destroy()
      editorView = null
    }
    // Clear any lingering CodeMirror contenteditable elements
    if (editorEl.value) {
      editorEl.value.innerHTML = ''
    }
    nextTick(() => {
      (document.activeElement as HTMLElement)?.blur()
      document.body.focus()
    })
  } else {
    nextTick(initEditor)
  }
}, { flush: 'sync' })

watch(() => props.content, (val) => {
  if (!props.filePath) return
  if (!editorView || val === undefined) return
  const current = editorView.state.doc.toString()
  if (current !== val) {
    editorView.setState(buildState(val, props.filePath))
  }
})
</script>

<template>
  <div class="editor-panel">
    <div v-show="!filePath" class="editor-empty">
      <div class="editor-empty-inner">
        <FileText :size="48" class="empty-icon" />
        <h2>Pilih file untuk mulai editing</h2>
        <p>Klik file di panel kiri, atau gunakan</p>
        <kbd>Ctrl+P</kbd>
      </div>
    </div>
    <div v-show="filePath" ref="editorEl" class="editor-cm" />

    <!-- Symbol Snippet Palette (Trigger: :) -->
    <SymbolPalette
      v-if="showSymbolPalette"
      ref="paletteRef"
      :query="symbolQuery"
      :position="palettePos"
      @select="insertSnippet"
      @close="showSymbolPalette = false"
    />

    <!-- Floating AI Action Popup -->
    <AiInlinePopup
      v-if="showAiPopup"
      :selected-text="selectedText"
      :position="aiPopupPos"
      @close="showAiPopup = false"
      @replace="handleAiReplace"
      @insert-below="handleAiInsertBelow"
    />
  </div>
</template>

<style scoped>
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-base);
  position: relative;
}
.editor-cm {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.editor-cm :deep(.cm-editor) {
  height: 100%;
  outline: none;
}
.editor-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.editor-empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
  text-align: center;
}
.empty-icon { opacity: 0.2; color: var(--accent); }
.editor-empty-inner h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}
.editor-empty-inner p { font-size: 12px; }
kbd {
  padding: 3px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
