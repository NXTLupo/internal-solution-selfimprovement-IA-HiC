import { useEffect, useRef, useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamRecipe } from '../services/api'
import type { RecipeFormData } from '../App'

interface Props {
  formData: RecipeFormData
  onContentUpdate: (content: string) => void
}

interface TocEntry {
  level: number
  text: string
  id: string
}

export default function RecipePreview({ formData, onContentUpdate }: Props) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showToc, setShowToc] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Extract table of contents from content
  const toc = useMemo<TocEntry[]>(() => {
    const entries: TocEntry[] = []
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.+)/)
      if (match) {
        const level = match[1].length
        const text = match[2].replace(/\*\*/g, '').trim()
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        entries.push({ level, text, id })
      }
    }
    return entries
  }, [content])

  // Count steps, phases, and variables for stats
  const stats = useMemo(() => {
    const phases = (content.match(/^#\s+PHASE/gm) || []).length
    const steps = (content.match(/^##\s+STEP/gm) || []).length
    const actions = (content.match(/###\s+Action\s+\d/gm) || []).length
    const variables = (content.match(/`var[A-Z]\w+`/g) || []).length
    const expressions = (content.match(/COPY-PASTE\s+into/gi) || []).length
    const warnings = (content.match(/(?:VERIFY|WATCH OUT|CRITICAL)[:\s]/g) || []).length
    const tips = (content.match(/BEGINNER TIP/g) || []).length
    return { phases, steps, actions, variables, expressions, warnings, tips }
  }, [content])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    // Start elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    const generate = async () => {
      setIsStreaming(true)
      setError('')
      let accumulated = ''

      try {
        for await (const chunk of streamRecipe(formData)) {
          accumulated += chunk
          setContent(accumulated)
          setCharCount(accumulated.length)
          onContentUpdate(accumulated)

          // Estimate progress by phase markers and content length
          const phases = (accumulated.match(/^# PHASE/gm) || []).length
          const steps = (accumulated.match(/^## STEP/gm) || []).length
          const hasChecklist = accumulated.includes('POST-BUILD CHECKLIST')
          const hasCredits = accumulated.includes('CREDIT CONSUMPTION')
          let est = Math.min(steps * 3 + phases * 5, 85)
          if (hasChecklist) est = Math.max(est, 90)
          if (hasCredits) est = Math.max(est, 95)
          setProgress(est)

          // Auto-scroll to bottom
          if (autoScroll && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight
          }
        }
        setProgress(100)
      } catch (e: any) {
        setError(e.message || 'Generation failed')
      } finally {
        setIsStreaming(false)
        onContentUpdate(accumulated)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }

    generate()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
  }

  const scrollToSection = (id: string) => {
    if (!contentRef.current) return
    const el = contentRef.current.querySelector(`[id="${id}"], h1, h2, h3`)
    // Find by text content since react-markdown doesn't add ids
    const headings = contentRef.current.querySelectorAll('h1, h2, h3')
    for (const h of headings) {
      const hId = (h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (hId === id) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setAutoScroll(false)
        break
      }
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  const estimatedLines = Math.round(charCount / 60)

  return (
    <div className="recipe-preview">
      <div className="preview-header">
        <div className="preview-title">
          <h2>
            <i className="fas fa-scroll"></i> {formData.agent_name || 'Agent'} -- Build Recipe
          </h2>
          {isStreaming && (
            <div className="streaming-indicator">
              <div className="pulse-dot"></div>
              <span>Generating comprehensive recipe...</span>
            </div>
          )}
          {!isStreaming && content && (
            <div className="streaming-indicator done">
              <i className="fas fa-check-circle"></i>
              <span>Complete -- {estimatedLines.toLocaleString()} lines in {formatTime(elapsedTime)}</span>
            </div>
          )}
        </div>

        <div className="preview-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="progress-text">{progress}%</span>
        </div>

        {/* Live stats bar */}
        <div className="preview-stats">
          {stats.phases > 0 && <span className="stat"><i className="fas fa-layer-group"></i> {stats.phases} phases</span>}
          {stats.steps > 0 && <span className="stat"><i className="fas fa-list-ol"></i> {stats.steps} steps</span>}
          {stats.actions > 0 && <span className="stat"><i className="fas fa-cog"></i> {stats.actions} actions</span>}
          {stats.expressions > 0 && <span className="stat"><i className="fas fa-code"></i> {stats.expressions} copy-paste blocks</span>}
          {stats.warnings > 0 && <span className="stat"><i className="fas fa-exclamation-triangle"></i> {stats.warnings} callouts</span>}
        </div>

        <div className="preview-actions">
          <button
            className={`icon-btn ${showToc ? 'active' : ''}`}
            onClick={() => setShowToc(!showToc)}
            title="Toggle table of contents"
          >
            <i className="fas fa-list"></i>
          </button>
          <button
            className={`icon-btn ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          >
            <i className="fas fa-arrow-down"></i>
          </button>
          <button className="icon-btn" onClick={copyToClipboard} title="Copy to clipboard" disabled={!content}>
            <i className="fas fa-copy"></i>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      <div className="preview-body">
        {/* Table of Contents sidebar */}
        {showToc && toc.length > 3 && (
          <div className="toc-sidebar">
            <div className="toc-header">
              <i className="fas fa-bookmark"></i> Contents
            </div>
            <div className="toc-list">
              {toc.map((entry, i) => (
                <button
                  key={i}
                  className={`toc-item toc-level-${entry.level}`}
                  onClick={() => scrollToSection(entry.id)}
                  title={entry.text}
                >
                  {entry.text.length > 45 ? entry.text.slice(0, 42) + '...' : entry.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="preview-content" ref={contentRef}>
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <div className="preview-placeholder">
              <div className="loading-spinner large"></div>
              <p>Generating your comprehensive build recipe with Claude...</p>
              <p className="hint">Comprehensive recipes with full variable documentation, copy-paste expressions, and node-by-node topic instructions typically take 2-5 minutes to generate.</p>
              <div className="generation-checklist">
                <p><i className="fas fa-check-circle"></i> Architecture diagram & prerequisites</p>
                <p><i className="fas fa-check-circle"></i> Step-by-step agent configuration</p>
                <p><i className="fas fa-check-circle"></i> Complete flow action stacks with every variable</p>
                <p><i className="fas fa-check-circle"></i> Copy-paste expressions with explanations</p>
                <p><i className="fas fa-check-circle"></i> Node-by-node topic creation</p>
                <p><i className="fas fa-check-circle"></i> Full Adaptive Card JSON schemas</p>
                <p><i className="fas fa-check-circle"></i> Testing, publishing & verification checklist</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
