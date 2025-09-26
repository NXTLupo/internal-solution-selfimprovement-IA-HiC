const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ChatRequest {
  prompt: string;
  subreddit?: string;
  date_range?: string;
}

interface ChatResponse {
  response: string;
}

/**
 * Sends a chat request to the local LLM service
 * @param request The chat request data including subreddit
 * @returns The LLM response
 */
export const sendChatRequest = async (request: ChatRequest): Promise<string> => {
  const apiUrl = `${API_BASE_URL}/api/chat`;
  
  console.log('Sending request to:', apiUrl, 'with subreddit:', request.subreddit);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Error: ${response.status}`);
  }
  
  const data = await response.json() as ChatResponse;
  return data.response;
};