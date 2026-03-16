import { useEffect, useState } from 'react'
import { fetchTemplates } from '../services/api'
import type { TemplateSummary } from '../App'

interface Props {
  onSelect: (template: TemplateSummary | null) => void
}

const complexityColors: Record<string, string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
}

export default function TemplateGallery({ onSelect }: Props) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="template-gallery">
      <div className="gallery-header">
        <h2>Choose a Template</h2>
        <p>Select a pre-built template to replicate an existing Intelligence Augmentation tool, or start from scratch.</p>
      </div>

      <div className="gallery-grid">
        {/* Start from Scratch card */}
        <div className="template-card scratch-card" onClick={() => onSelect(null)}>
          <div className="template-card-icon">
            <i className="fas fa-plus-circle"></i>
          </div>
          <div className="template-card-content">
            <h3>Start from Scratch</h3>
            <p>Build a custom Copilot Studio agent recipe from a blank canvas</p>
          </div>
          <div className="template-card-footer">
            <span className="complexity-badge" style={{ background: '#6366F1' }}>Custom</span>
          </div>
        </div>

        {loading && (
          <div className="template-card loading-card">
            <div className="loading-spinner"></div>
            <p>Loading templates...</p>
          </div>
        )}

        {templates.map((t) => (
          <div key={t.id} className="template-card" onClick={() => onSelect(t)}>
            {t.thumbnail && (
              <div className="template-card-thumbnail">
                <img src={`/static/${t.thumbnail}`} alt={t.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
            <div className="template-card-icon">
              <i className={t.icon || 'fas fa-robot'}></i>
            </div>
            <div className="template-card-content">
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <div className="template-meta">
                <span className="meta-item">
                  <i className="fas fa-clock"></i> {t.estimated_build_time}
                </span>
                <span className="meta-item">
                  <i className="fas fa-exchange-alt"></i> {t.replicates_service}
                </span>
              </div>
            </div>
            <div className="template-card-footer">
              <span
                className="complexity-badge"
                style={{ background: complexityColors[t.complexity] || '#6366F1' }}
              >
                {t.complexity}
              </span>
              <span className="select-hint">Click to configure</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
