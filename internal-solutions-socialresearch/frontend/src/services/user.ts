const API_BASE_URL = 'http://localhost:8081';

export const userService = {
  // Get user projects
  getUserProjects: async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/projects/${userId}`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user projects:', error);
      throw error;
    }
  },

  // Create new project
  createProject: async (userId: string, projectType: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          type: projectType
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
  }
}; 