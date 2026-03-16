import React, { useState, useEffect } from 'react';
import './styles.css';

const App = (props) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [journeyType, setJourneyType] = useState('customer');
  
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }
    
    setError(null);
    setUploading(true);
    
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (journeyType) formData.append('journey_type', journeyType);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error uploading files');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing your files');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="enterprise-body">{/* Intelligence Augmentation header is rendered in HTML template */}

      <div className="enterprise-container">
        {/* Upload Form - Primary Action */}
        <div className="enterprise-card">
          <div className="section-header">
            <div className="section-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <div className="section-info">
              <h2 className="section-title">Create Journey Map</h2>
              <p className="section-description">Upload your data files and customize your journey map settings</p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-triangle" style={{marginRight: 'var(--enterprise-space-2)'}}></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="enterprise-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  <i className="fas fa-heading"></i>
                  Journey Title (optional)
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Customer Journey Map"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="journeyType" className="form-label">
                  <i className="fas fa-route"></i>
                  Journey Type
                </label>
                <select
                  id="journeyType"
                  value={journeyType}
                  onChange={(e) => setJourneyType(e.target.value)}
                  className="form-input"
                >
                  <option value="customer">Customer Journey</option>
                  <option value="user">User Experience Journey</option>
                  <option value="employee">Employee Journey</option>
                  <option value="service">Service Journey</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="description" className="form-label">
                <i className="fas fa-align-left"></i>
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this journey mapping project..."
                rows="3"
                className="form-textarea"
              />
            </div>
            
            <div className="file-upload-section">
              <div className="file-upload-header">
                <h3 className="file-upload-title">
                  <i className="fas fa-file-upload"></i>
                  Upload Data Files
                </h3>
                <p className="file-upload-subtitle">Support for CSV, TXT, PDF, JSON files</p>
              </div>
              
              <div className="file-upload-area">
                <div className="upload-icon">
                  <i className="fas fa-cloud-upload-alt"></i>
                </div>
                <div className="upload-text">Drop your files here or click to browse</div>
                <div className="upload-hint">Multiple files supported • Max 50MB per file</div>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileChange}
                  className="file-input-hidden"
                  accept=".csv,.txt,.pdf,.json"
                />
                <button 
                  type="button" 
                  className="enterprise-btn enterprise-btn-secondary"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <i className="fas fa-folder-open"></i>
                  Choose Files
                </button>
              </div>
              
              {files.length > 0 && (
                <div className="file-list-container">
                  <h4 className="file-list-title">
                    <i className="fas fa-check-circle"></i>
                    Selected Files ({files.length})
                  </h4>
                  <div className="file-list">
                    {files.map((file, index) => (
                      <div key={index} className="file-item">
                        <div className="file-info">
                          <div className="file-name">
                            <i className="fas fa-file"></i>
                            {file.name}
                          </div>
                          <div className="file-size">{Math.round(file.size / 1024)} KB</div>
                        </div>
                        <div className="file-status">
                          <i className="fas fa-check-circle text-success"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="enterprise-btn enterprise-btn-primary"
                disabled={uploading || files.length === 0}
              >
                {uploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Generating Journey Map...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    Generate Journey Map
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="enterprise-card">
            <div className="success-banner">
              <div className="success-content">
                <h3 className="success-title">
                  <i className="fas fa-check-circle"></i>
                  Journey Map Generated Successfully!
                </h3>
                <p className="success-subtitle">Your data has been transformed into an interactive journey map</p>
                <h4 className="journey-title">{result.title}</h4>
                <div className="success-actions">
                  <a 
                    href={result.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="enterprise-btn enterprise-btn-success"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    View Interactive Journey Map
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="enterprise-card">
          <div className="section-header">
            <div className="section-icon">
              <i className="fas fa-magic"></i>
            </div>
            <div className="section-info">
              <h2 className="section-title">Key Features</h2>
              <p className="section-description">Powered by Claude 4.5 for intelligent journey analysis</p>
            </div>
          </div>
          
          <div className="enterprise-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-brain"></i>
              </div>
              <div className="feature-title">AI-Powered Analysis</div>
              <div className="feature-description">Claude 4.5 intelligently analyzes your data to identify touchpoints, emotions, and journey phases</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-project-diagram"></i>
              </div>
              <div className="feature-title">Interactive Visualization</div>
              <div className="feature-description">Dynamic Mermaid diagrams with clickable elements and detailed journey flows</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-file-alt"></i>
              </div>
              <div className="feature-title">Multi-Format Support</div>
              <div className="feature-description">Process CSV, TXT, PDF, and JSON files with intelligent content extraction</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-download"></i>
              </div>
              <div className="feature-title">Export & Share</div>
              <div className="feature-description">Download your journey maps as HTML or integrate with other tools</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;