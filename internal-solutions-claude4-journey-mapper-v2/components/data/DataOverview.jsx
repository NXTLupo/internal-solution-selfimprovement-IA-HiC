import React from 'react';
import { FileText, Zap, Upload } from 'lucide-react';
import FileUpload from './FileUpload';
import { uploadFiles, analyzeJourney } from '../../api';

const DataOverview = ({ uploadedFiles = [], onFileUpload, onAnalyze }) => {
  const handleFileUpload = async (files) => {
    try {
      const result = await uploadFiles(files);
      if (result.success) {
        onFileUpload([...uploadedFiles, ...files]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  const handleAnalyzeData = async () => {
    if (uploadedFiles.length === 0) return;
    onAnalyze();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Files Uploaded"
          value={uploadedFiles.length}
          description="Total files ready for analysis"
          icon={<FileText className="text-indigo-600" />}
        />
        <MetricCard
          title="Processing Location"
          value="Local"
          description="100% privacy-focused analysis"
          icon={<Zap className="text-indigo-600" />}
        />
        <MetricCard
          title="Supported Formats"
          value="4+"
          description="CSV, JSON, PDF, TXT"
          icon={<FileText className="text-indigo-600" />}
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Upload Files</h3>
          <p className="text-sm text-gray-500 mt-1">Upload customer data files to analyze and map the journey</p>
        </div>
        <div className="p-6">
          <FileUpload onFileUpload={handleFileUpload} />
          
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Files ({uploadedFiles.length})</h4>
              <div className="overflow-hidden bg-white shadow-sm border border-gray-200 rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {uploadedFiles.map((file, i) => (
                    <li key={i} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="text-gray-400 mr-3" size={18} />
                        <span className="text-sm font-medium text-gray-700">{file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{Math.floor(file.size / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-right">
            <button
              onClick={handleAnalyzeData}
              disabled={uploadedFiles.length === 0}
              className={`px-5 py-2 rounded-lg text-white font-medium ${
                uploadedFiles.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Analyze Journey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, description, icon }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-start">
      <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="mt-1 text-3xl font-semibold text-gray-800">{value}</div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  </div>
);

export default DataOverview;