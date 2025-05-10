import { TopicData } from '../types/TopicModeling';
const API_BASE_URL = 'http://localhost:8081'

export interface RAGRequest {
  prompt: string;
  subreddit: string;
  topicData?: TopicData | null;
}

export const sendRAGRequest = async (request: RAGRequest) => {
  try {
    // Create URLSearchParams object for form-urlencoded data
    const formData = new URLSearchParams();
    formData.append('prompt', request.prompt);
    formData.append('subreddit', request.subreddit);
    
    // Add topicData if it exists
    if (request.topicData) {
      formData.append('topicData', JSON.stringify(request.topicData));
    }
    
    const response = await fetch(`${API_BASE_URL}/api/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    return response.json();
  } catch (error) {
    console.error('Error in RAG request:', error);
    throw error;
  }
};