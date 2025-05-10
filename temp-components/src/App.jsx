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
    <div className="journey-mapper-container">
      <header className="header">
        <h1>AI Journey Mapper</h1>
        <p>Upload your data to generate an interactive journey map</p>
      </header>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="title">Journey Title (optional)</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Customer Journey Map"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this journey..."
            rows="3"
          />
        </div>
        
        <div className="form-group file-upload">
          <label htmlFor="file-upload">Upload Files</label>
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileChange}
            className="file-input"
          />
          <div className="file-input-info">
            {files.length > 0 ? (
              <ul className="file-list">
                {files.map((file, index) => (
                  <li key={index}>{file.name} ({Math.round(file.size / 1024)} KB)</li>
                ))}
              </ul>
            ) : (
              <p>Support for CSV, TXT, PDF, JSON files</p>
            )}
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-button" 
          disabled={uploading}
        >
          {uploading ? 'Generating Journey Map...' : 'Generate Journey Map'}
        </button>
      </form>
      
      {result && (
        <div className="result-container">
          <h2>Journey Map Generated!</h2>
          <h3>{result.title}</h3>
          <div className="buttons">
            <a 
              href={result.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="view-button"
            >
              View Interactive Journey Map
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;