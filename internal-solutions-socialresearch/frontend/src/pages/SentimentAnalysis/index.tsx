import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnalysisForm } from './AnalysisForm';
import { AnalysisResults } from './AnalysisResults';
import { useRedditAnalysis } from '../../hooks/useLLMAnalyzer';
import { AnalysisFormData, Category, Point, AnalysisData } from '../../types/analysis';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setFormData, setAnalysisData } from '../../store/sentimentAnalysisSlice';
import { AISummaryResponse } from '../../services/llmAnalyzer';

// Define API base URL
const API_BASE_URL = 'http://localhost:8081';

// Define a custom interface that extends the existing AnalysisData and includes ai_summary
interface ExtendedAnalysisData extends AnalysisData {
  ai_summary?: AISummaryResponse;
}

// Update this function to handle exporting filtered data and include subreddit/topic
const exportToMarkdown = (
  analysis: ExtendedAnalysisData,
  filteredData: ExtendedAnalysisData | null,
  projectId: string | undefined,
  subreddit: string,
  applicationName: string
) => {
  // Use filtered data if available, otherwise use the original analysis
  const dataToExport = filteredData || analysis;
  if (!dataToExport) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sentiment-analysis-${subreddit || 'reddit'}-${applicationName || 'topic'}-${projectId || 'export'}-${timestamp}.md`;
  
  // Create markdown content with dynamic title
  let markdownContent = `# Sentiment Analysis Report: r/${subreddit}`;
  if (applicationName) {
    markdownContent += ` - ${applicationName}`;
  }
  markdownContent += `\n\n`;
  
  if (dataToExport.ai_summary) {
    markdownContent += `## AI Summary\n\n${dataToExport.ai_summary.summary}\n\n`;
    markdownContent += `### Top Positive Feedback\n\n${dataToExport.ai_summary.topPositive}\n\n`;
    markdownContent += `### Top Negative Feedback\n\n${dataToExport.ai_summary.topNegative}\n\n`;
    
    markdownContent += `### Recommendations\n\n`;
    dataToExport.ai_summary.recommendations.forEach((rec: string, index: number) => {
      markdownContent += `${index + 1}. ${rec}\n`;
    });
    markdownContent += `\n\n`;
  }
  
  // Add analysis data
  if (dataToExport.merged_result) {
    markdownContent += `## Detailed Analysis\n\n`;
    
    // Positive feedback
    markdownContent += `### Positive Feedback\n\n`;
    dataToExport.merged_result.positive.forEach((category: Category) => {
      markdownContent += `#### ${category.category}\n\n`;
      category.points.forEach((point: Point) => {
        // Add the main point
        markdownContent += `- ${point.point} (${point.frequency} mentions)\n`;
        // Add the evidence snippets if they exist
        if (point.evidence && typeof point.evidence === 'object') {
          Object.values(point.evidence).forEach((evidenceText: string[]) => {
            // Format evidence as a blockquote or nested item
            if (Array.isArray(evidenceText)) {
              evidenceText.forEach(text => {
                markdownContent += `  > ${text}\n`;
              });
            } else {
              markdownContent += `  > ${evidenceText}\n`; // Using blockquote for evidence
            }
          });
        }
      });
      markdownContent += `\n`;
    });
    
    // Negative feedback
    markdownContent += `### Negative Feedback\n\n`;
    dataToExport.merged_result.negative.forEach((category: Category) => {
      markdownContent += `#### ${category.category}\n\n`;
      category.points.forEach((point: Point) => {
        // Add the main point
        markdownContent += `- ${point.point} (${point.frequency} mentions)\n`;
        // Add the evidence snippets if they exist
        if (point.evidence && typeof point.evidence === 'object') {
          Object.values(point.evidence).forEach((evidenceText: string[]) => {
            // Format evidence as a blockquote or nested item
            if (Array.isArray(evidenceText)) {
              evidenceText.forEach(text => {
                markdownContent += `  > ${text}\n`;
              });
            } else {
              markdownContent += `  > ${evidenceText}\n`; // Using blockquote for evidence
            }
          });
        }
      });
      markdownContent += `\n`;
    });
  }
  
  // Create a blob and download
  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function SentimentAnalysis() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projectId } = useParams<{ projectId: string }>();
  
  // Get data from Redux store
  const reduxFormData = useSelector((state: RootState) => state.sentimentAnalysis);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const dateFilteredData = useSelector((state: RootState) => state.sentimentAnalysis.dateFilteredData) as ExtendedAnalysisData | null;
  
  const {
    analysis,
    loading,
    error,
    rawResponse,
    streamedReasoning,
    streamedJson,
    isThinking,
    handleAnalyze,
    cancelAnalysis,
    clearError,
    isPolling
  } = useRedditAnalysis();

  const [formData, setLocalFormData] = useState<AnalysisFormData>({
    subreddit: reduxFormData.subreddit || 'ouraring',
    applicationName: reduxFormData.applicationName || 'ring',
    postLimit: reduxFormData.postLimit || 50,
    sort: reduxFormData.sort || 'relevance',
    timeFilter: reduxFormData.timeFilter || 'all',
    filterType: reduxFormData.filterType || 'cluster',
    keyword: reduxFormData.keyword || '',
    mergeMethod: reduxFormData.mergeMethod || 'deepseek',
    chunkSize: reduxFormData.chunkSize || 30000,
    analysisModel: reduxFormData.analysisModel || 'deepseek-r1',
    maxWorkers: reduxFormData.maxWorkers || 3,
  });

  const [projectLoaded, setProjectLoaded] = useState(false);

  // Use a ref to access current formData without adding it as a dependency
  const formDataRef = useRef(formData);
  // Update ref when formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Load project data if projectId is provided
  useEffect(() => {
    const loadProjectData = async () => {
      // Add checks for user and user.projects before proceeding
      if (!projectId || projectLoaded || !user || !Array.isArray(user.projects)) {
        // If no projectId, already loaded, user not loaded, or projects not an array, don't proceed yet.
        // If projectId exists but user/projects aren't ready, this effect will re-run when they are.
        if (projectId && !projectLoaded && user && !Array.isArray(user.projects)) {
            console.log("Waiting for user projects to load...");
        }
        return;
      }

      try {
        console.log("Loading project data for ID:", projectId);

        // Now it's safe to access user.projects
        const project = user.projects.find(p => p.id === projectId);
        console.log("Found project in Redux:", project);
        
        if (project && project.data) {
          // If project data exists in Redux, use it
          console.log("Using project data from Redux:", project.data);
          dispatch(setAnalysisData({
            id: projectId,
            data: project.data
          }));
          
          // Update form data if metadata is available
          if (project.subreddit || project.topic) {
            console.log("Updating form data with project metadata");
            const currentFormData = formDataRef.current;
            const updatedFormData: AnalysisFormData = {
              ...currentFormData,
              subreddit: project.subreddit || currentFormData.subreddit,
              applicationName: project.topic || currentFormData.applicationName,
              postLimit: project.post_count || currentFormData.postLimit,
              sort: (project.sort_by as "relevance" | "hot" | "top" | "new" | "comments" | undefined) || currentFormData.sort,
              timeFilter: (project.time_period as "hour" | "day" | "week" | "month" | "year" | "all" | undefined) || currentFormData.timeFilter,
              filterType: currentFormData.filterType,
              keyword: currentFormData.keyword,
              mergeMethod: currentFormData.mergeMethod,
              chunkSize: currentFormData.chunkSize,
              analysisModel: currentFormData.analysisModel,
              maxWorkers: currentFormData.maxWorkers
            };
            
            setLocalFormData(updatedFormData);
            dispatch(setFormData(updatedFormData));
          }
          
          setProjectLoaded(true);
        } else {
          // If not in Redux, fetch from API
          console.log("Fetching project data from API");
          const response = await fetch(`${API_BASE_URL}/api/user/project/${projectId}`);
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          
          const projectData = await response.json();
          if (projectData && projectData.data) {
            // Store in Redux
            dispatch(setAnalysisData({
              id: projectId,
              data: projectData.data
            }));
            
            // Update form data with metadata
            const currentFormData = formDataRef.current;
            const updatedFormData: AnalysisFormData = {
              ...currentFormData,
              subreddit: projectData.subreddit || currentFormData.subreddit,
              applicationName: projectData.topic || currentFormData.applicationName,
              postLimit: projectData.post_count || currentFormData.postLimit,
              sort: (projectData.sort_by as "relevance" | "hot" | "top" | "new" | "comments" | undefined) || currentFormData.sort,
              timeFilter: (projectData.time_period as "hour" | "day" | "week" | "month" | "year" | "all" | undefined) || currentFormData.timeFilter,
              filterType: currentFormData.filterType,
              keyword: currentFormData.keyword,
              mergeMethod: currentFormData.mergeMethod,
              chunkSize: currentFormData.chunkSize,
              analysisModel: currentFormData.analysisModel,
              maxWorkers: currentFormData.maxWorkers
            };
            
            setLocalFormData(updatedFormData);
            dispatch(setFormData(updatedFormData));
          }
          
          setProjectLoaded(true);
        }
      } catch (err: unknown) {
        console.error("Error loading project data:", err);
        // Don't navigate away, just show an error message
      }
    };
    
    loadProjectData();
  }, [projectId, user, dispatch, projectLoaded]);

  const handleSubmit = () => {
    // Update Redux with the current form data
    dispatch(setFormData(formData));
    
    // Start analysis with the current project ID
    handleAnalyze(formData, projectId);
  };

  const backgroundColor = 'rgba(16,18,20,255)';

  // Prepare analysis data for the AnalysisResults component
  const analysisToDisplay = analysis ? 
    { ...analysis } as ExtendedAnalysisData :
    (reduxFormData.data ?
      {
        merged_result: reduxFormData.data.merged_result,
        formatted_data: reduxFormData.data.formatted_data,
        ai_summary: reduxFormData.data.ai_summary
      } as ExtendedAnalysisData :
      null);

  // Create a string-only version of rawResponse for AnalysisResults component
  const formattedRawResponse = typeof rawResponse === 'string' ? rawResponse : 
    (rawResponse ? JSON.stringify(rawResponse, null, 2) : null);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Header */}
      <div className="w-full py-3 px-6 flex items-center" style={{ backgroundColor }}>
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
        <div className="flex items-center">
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <img src="/nxt-humans-logo.png" alt="NXT Humans Logo" className="h-12" />
          </div>
        </div>
        </div>
        
        <div className="text-white font-bold text-2xl mx-auto">
          {projectId ? (formData.subreddit || 'New Project') + (formData.applicationName ? ' - ' + formData.applicationName : '') : 'Reddit Sentiment Analysis'}
        </div>
        
        <div className="flex items-center gap-4">
          {isPolling ? (
            <button 
              onClick={cancelAnalysis}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-red-500/20 h-[42px] w-32"
            >
              Cancel
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-blue-500/20 h-[42px] w-32"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          )}
          
          {analysisToDisplay && (
            <button
              onClick={() => {
                console.log("Data being exported:", analysisToDisplay);
                exportToMarkdown(
                  analysisToDisplay,
                  dateFilteredData,
                  projectId,
                  formData.subreddit,
                  formData.applicationName
                );
              }}
               className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-green-500/20 h-[42px]"
            >
              Export to Markdown
            </button>
          )}
          
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pt-3 px-4 pb-6 flex-grow">
        <AnalysisForm
          onSubmit={(data) => handleAnalyze(data, projectId)}
          loading={loading}
          error={error}
          onClearError={clearError}
          formData={formData}
          setFormData={(value) => {
            if (typeof value === 'function') {
              setLocalFormData(prev => value(prev));
            } else {
              setLocalFormData(value);
            }
          }}
          projectId={projectId}
        />

        <ErrorBoundary>
          <AnalysisResults
            rawResponse={formattedRawResponse}
            streamedReasoning={streamedReasoning}
            streamedJson={streamedJson}
            loading={loading}
            isThinking={isThinking}
            analysis={analysisToDisplay}
            isPolling={isPolling}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default SentimentAnalysis; 