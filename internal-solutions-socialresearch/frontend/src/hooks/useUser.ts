// hook for user related apis
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { userService } from '../services/user';
import { addProject, clearProjects, removeProject } from '../store/userSlice';

export const useUser = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's projects
  const fetchUserProjects = async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await userService.getUserProjects(userId);
      
      if (data && Array.isArray(data)) {
        // Clear existing projects first to avoid duplicates
        dispatch(clearProjects());
        
        // Add each project to Redux store
        data.forEach(project => {
          // Extract project name based on type
          let projectName = 'Unnamed Project';
          
          if (project.type === 'topic' && project.subreddit) {
            // For topic modeling, use the subreddit name
            projectName = project.subreddit;
          } else if (project.type === 'sentiment' && project.subreddit && project.topic) {
            // For sentiment analysis, use subreddit and topic
            projectName = `${project.subreddit} - ${project.topic}`;
          } else if (project.data && typeof project.data === 'object') {
            // Fallback to looking in the data object if metadata fields aren't available
            // Try to find subreddit in different possible locations
            if (project.data.subreddit) {
              projectName = project.data.subreddit;
              
              // For sentiment analysis, add topic if available
              if (project.type === 'sentiment' && project.data.topic) {
                projectName = `${project.data.subreddit} - ${project.data.topic}`;
              }
            } else if (project.data.formatted_data && project.data.formatted_data.subreddit) {
              projectName = project.data.formatted_data.subreddit;
              
              // For sentiment analysis, add topic if available
              if (project.type === 'sentiment' && project.data.formatted_data.topic) {
                projectName = `${project.data.formatted_data.subreddit} - ${project.data.formatted_data.topic}`;
              }
            } else if (project.data.merged_result && project.data.merged_result.subreddit) {
              projectName = project.data.merged_result.subreddit;
              
              // For sentiment analysis, add topic if available
              if (project.type === 'sentiment' && project.data.merged_result.topic) {
                projectName = `${project.data.merged_result.subreddit} - ${project.data.merged_result.topic}`;
              }
            }
          }
          
          dispatch(addProject({
            id: project.id,
            name: projectName,
            type: project.type,
            created_at: project.created_at || new Date().toISOString(),
            sources: 1, // Default to 1 source
            data: project.data, // Store the full data
            subreddit: project.subreddit,
            topic: project.topic,
            post_count: project.post_count,
            sort_by: project.sort_by,
            time_period: project.time_period
          }));
        });
      }
      return data;
    } catch (err: unknown) {
      console.error('Error fetching user projects:', err);
      setError(`Failed to load projects: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create a new project
  const createProject = async (projectType: string) => {
    if (!user) {
      throw new Error("No user found");
    }
    
    try {
      const data = await userService.createProject(user.id, projectType);
      return data;
    } catch (err: unknown) {
      console.error('Error creating project:', err);
      throw err;
    }
  };

  // Delete a project
  const deleteProject = async (projectId: string) => {
    try {
      await userService.deleteProject(projectId);
      // Remove the project from Redux store
      dispatch(removeProject(projectId));
      return true;
    } catch (err: unknown) {
      console.error('Error deleting project:', err);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    fetchUserProjects,
    createProject,
    deleteProject
  };
};


