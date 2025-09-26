const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


export const userService = {
  // Get user projects
  getUserProjects: async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/projects/${userId}`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      
      // Get the raw response first
      const rawText = await response.text();
      // Then parse it as JSON
      const data = JSON.parse(rawText);
      
      return data;
    } catch (error: unknown) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  },

  // Create new project
  createProject: async (userId: string, projectType: string, additionalData = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          type: projectType,
          ...additionalData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Delete project
  deleteProject: async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },
  
  // Get single project by ID
  getProject: async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/project/${projectId}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const project = await response.json();
      return project;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }
}; 