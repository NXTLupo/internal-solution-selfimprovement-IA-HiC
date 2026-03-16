import type { KnowledgeSource } from '../App'

interface Props {
  sources: KnowledgeSource[]
  onChange: (sources: KnowledgeSource[]) => void
}

const SOURCE_TYPES = [
  { value: 'SharePoint', icon: 'fas fa-share-alt', hint: 'SharePoint site URL or document library path' },
  { value: 'Dataverse', icon: 'fas fa-database', hint: 'Dataverse table or environment URL' },
  { value: 'Website URL', icon: 'fas fa-globe', hint: 'Public website URL for knowledge grounding' },
  { value: 'File upload', icon: 'fas fa-file-upload', hint: 'Uploaded files (PDF, DOCX, XLSX, PPTX)' },
]

export default function KnowledgeSourcePicker({ sources, onChange }: Props) {
  const addSource = (sourceType: string) => {
    onChange([...sources, { source_type: sourceType, path_or_url: '', name: '', description: '' }])
  }

  const removeSource = (index: number) => {
    onChange(sources.filter((_, i) => i !== index))
  }

  const updateSource = (index: number, partial: Partial<KnowledgeSource>) => {
    onChange(sources.map((s, i) => (i === index ? { ...s, ...partial } : s)))
  }

  return (
    <div className="knowledge-picker">
      {sources.map((source, i) => {
        const typeInfo = SOURCE_TYPES.find((t) => t.value === source.source_type)
        return (
          <div key={i} className="knowledge-item">
            <div className="item-header">
              <span className="item-number">
                <i className={typeInfo?.icon || 'fas fa-database'}></i> {source.source_type}
              </span>
              <button className="remove-btn" onClick={() => removeSource(i)}>
                <i className="fas fa-trash"></i>
              </button>
            </div>

            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={source.name}
                onChange={(e) => updateSource(i, { name: e.target.value })}
                placeholder="e.g., Research Documents Library"
              />
            </div>

            <div className="form-group">
              <label>Path / URL</label>
              <input
                type="text"
                value={source.path_or_url}
                onChange={(e) => updateSource(i, { path_or_url: e.target.value })}
                placeholder={typeInfo?.hint || 'Enter path or URL'}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={source.description}
                onChange={(e) => updateSource(i, { description: e.target.value })}
                placeholder="Describe the content in this knowledge source"
                rows={2}
              />
            </div>
          </div>
        )
      })}

      <div className="source-type-buttons">
        {SOURCE_TYPES.map((st) => (
          <button key={st.value} className="source-type-btn" onClick={() => addSource(st.value)}>
            <i className={st.icon}></i>
            <span>{st.value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
