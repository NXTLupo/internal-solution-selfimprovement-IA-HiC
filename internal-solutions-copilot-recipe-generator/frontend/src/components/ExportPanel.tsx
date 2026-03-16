import { useState } from 'react'
import { exportRecipe } from '../services/api'

interface Props {
  content: string
  agentName: string
}

export default function ExportPanel({ content, agentName }: Props) {
  const [exporting, setExporting] = useState(false)

  const downloadFile = (data: string, filename: string, mimeType: string) => {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportMarkdown = () => {
    const filename = `${agentName.replace(/\s+/g, '_')}_recipe.md`
    downloadFile(content, filename, 'text/markdown')
  }

  const handleExportHTML = async () => {
    setExporting(true)
    try {
      const result = await exportRecipe(content, 'html', agentName)
      if (result.html) {
        downloadFile(result.html, result.filename || 'recipe.html', 'text/html')
      }
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="export-panel">
      <h3><i className="fas fa-download"></i> Export Recipe</h3>
      <div className="export-buttons">
        <button className="export-btn markdown" onClick={handleExportMarkdown}>
          <i className="fas fa-file-alt"></i>
          Download Markdown
        </button>
        <button className="export-btn html" onClick={handleExportHTML} disabled={exporting}>
          <i className="fas fa-file-code"></i>
          {exporting ? 'Generating...' : 'Download Branded HTML'}
        </button>
        <button className="export-btn copy" onClick={handleCopy}>
          <i className="fas fa-clipboard"></i>
          Copy to Clipboard
        </button>
      </div>
    </div>
  )
}
