from sqlalchemy.orm import Session
from app.db.models.reddit_models import RedditSearch, RedditPost, RedditComment, RedditAnalysisResult, RedditJobStatus
from typing import Dict, List, Any, Optional
import json
from datetime import datetime
import uuid

def generate_job_id():
    """Generate a unique job ID"""
    return str(uuid.uuid4())

class JobsRepository:
    def __init__(self, db: Session):
        self.db = db

    # Job Status Management Methods
    
    def create_job(self, job_id: str, user_id: str, project_id: str, parameters: Dict) -> RedditJobStatus:
        """
        Create a new job in the database
        
        Args:
            job_id: Unique identifier for the job
            user_id: ID of the user who created the job
            project_id: ID of the project/analysis
            parameters: Job configuration parameters (subreddit, query, analysis settings, etc.)
            
        Returns:
            The created job object
            
        Raises:
            ValueError: If required parameters are invalid
            Exception: If database operation fails
        """
        # Validate required parameters
        if not job_id or not isinstance(job_id, str) or job_id.strip() == "":
            raise ValueError("job_id is required and must be a non-empty string")
        
        if not user_id or not isinstance(user_id, str) or user_id.strip() == "":
            raise ValueError("user_id is required and must be a non-empty string")
            
        if not project_id or not isinstance(project_id, str) or project_id.strip() == "":
            raise ValueError("project_id is required and must be a non-empty string")
            
        if parameters is None:
            parameters = {}
        elif not isinstance(parameters, dict):
            raise ValueError("parameters must be a dictionary")
        
        try:
            # Get subreddit and query from parameters for logging purposes
            subreddit = parameters.get('subreddit', 'unknown')
            query = parameters.get('query', 'unknown')
            print(f"[create_job] Creating job {job_id} for user {user_id}, subreddit: {subreddit}, query: {query}")
            
            job = RedditJobStatus(
                id=job_id,
                user_id=user_id,
                analysis_id=project_id,
                status="pending",
                message="Job created and queued for processing",
                parameters=parameters,
                progress=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            self.db.add(job)
            self.db.commit()
            self.db.refresh(job)
            
            print(f"[create_job] Created job with ID: {job.id}")
            return job
            
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            # Rollback the transaction on any database error
            self.db.rollback()
            print(f"[create_job] Error creating job {job_id}: {str(e)}")
            raise Exception(f"Failed to create job: {str(e)}")
    
    def update_job_status(self, job_id: str, status: str, message: str = None, 
                         progress: int = None, error: str = None, analysis_id: str = None) -> bool:
        """
        Update the status of a job
        
        Args:
            job_id: ID of the job to update
            status: New status (pending, processing, completed, failed, cancelled)
            message: Optional status message
            progress: Optional progress percentage (0-100)
            error: Optional error message if status is 'failed'
            analysis_id: Optional ID of analysis result once completed
            
        Returns:
            True if job was updated, False if job not found
        """
        print(f"[update_job_status] Updating job {job_id} to status {status}")
        
        job = self.db.query(RedditJobStatus).filter(RedditJobStatus.id == job_id).first()
        if not job:
            print(f"[update_job_status] Job not found with ID: {job_id}")
            return False
        
        job.status = status
        job.updated_at = datetime.utcnow()
        
        if message:
            job.message = message
            
        if progress is not None:
            job.progress = progress
            
        if error:
            job.error = error
            
        if analysis_id:
            job.analysis_id = analysis_id
        
        try:
            self.db.commit()
            print(f"[update_job_status] Successfully updated job {job_id}")
            return True
        except Exception as e:
            self.db.rollback()
            print(f"[update_job_status] Error updating job {job_id}: {str(e)}")
            return False
    
    def update_job_status_with_session(self, job_id: str, status: str, message: str = None, 
                                     progress: int = None, result: Dict = None, error: str = None) -> bool:
        """
        Standalone method to update job status with its own database session
        
        Args:
            job_id: ID of the job to update
            status: New status (pending, processing, completed, failed, cancelled)
            message: Optional status message
            progress: Optional progress percentage (0-100)
            result: Optional result dictionary that might contain analysis_id
            error: Optional error message if status is 'failed'
            
        Returns:
            True if job was updated, False if job not found
        """
        analysis_id = None
        if result and 'analysis_id' in result:
            analysis_id = result.get('analysis_id')
            
        try:
            return self.update_job_status(
                job_id=job_id,
                status=status,
                message=message,
                progress=progress,
                error=error,
                analysis_id=analysis_id
            )
        except Exception as e:
            print(f"Error updating job status in database: {str(e)}")
            return False
    
    def get_job_by_id(self, job_id: str) -> Optional[RedditJobStatus]:
        """
        Get a job by its ID
        
        Args:
            job_id: The ID of the job to retrieve
            
        Returns:
            The job object if found, None otherwise
        """
        return self.db.query(RedditJobStatus).filter(RedditJobStatus.id == job_id).first()
    
    def get_jobs_by_user_id(self, user_id: str, limit: int = 20) -> List[RedditJobStatus]:
        """
        Get all jobs for a user
        
        Args:
            user_id: The ID of the user
            limit: Maximum number of jobs to return
            
        Returns:
            List of job objects
        """
        return (self.db.query(RedditJobStatus)
                .filter(RedditJobStatus.user_id == user_id)
                .order_by(RedditJobStatus.updated_at.desc())
                .limit(limit)
                .all())
    
    def get_jobs_by_analysis_id(self, analysis_id: str) -> List[RedditJobStatus]:
        """
        Get all jobs associated with an analysis
        
        Args:
            analysis_id: The ID of the analysis
            
        Returns:
            List of job objects
        """
        return (self.db.query(RedditJobStatus)
                .filter(RedditJobStatus.analysis_id == analysis_id)
                .order_by(RedditJobStatus.updated_at.desc())
                .all())
    
    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a job if it's still pending or processing
        
        Args:
            job_id: The ID of the job to cancel
            
        Returns:
            True if job was cancelled, False otherwise
        """
        job = self.db.query(RedditJobStatus).filter(RedditJobStatus.id == job_id).first()
        
        if not job:
            return False
            
        if job.status in ["pending", "processing"]:
            job.status = "cancelled"
            job.message = "Job was cancelled by user request"
            job.updated_at = datetime.utcnow()
            
            self.db.commit()
            return True
            
        return False

    def get_jobs_by_project_id(self, project_id: str) -> List[RedditJobStatus]:
        """
        Get all jobs associated with a project ID
        
        Args:
            project_id: The project ID to search for
            
        Returns:
            List of job objects that have this project_id in their parameters
        """
        # Query jobs where parameters JSON contains the project_id
        jobs = self.db.query(RedditJobStatus).filter(
            RedditJobStatus.parameters.op('->>')('project_id') == project_id
        ).all()
        
        return jobs
    
    def cancel_jobs_by_project_id(self, project_id: str) -> int:
        """
        Cancel all jobs associated with a project ID that are pending or processing
        
        Args:
            project_id: The project ID to cancel jobs for
            
        Returns:
            Number of jobs that were cancelled
        """
        # Find all jobs with this project_id that can be cancelled
        jobs = self.db.query(RedditJobStatus).filter(
            RedditJobStatus.parameters.op('->>')('project_id') == project_id,
            RedditJobStatus.status.in_(["pending", "processing"])
        ).all()
        
        cancelled_count = 0
        for job in jobs:
            job.status = "cancelled"
            job.message = "Job was cancelled by project cancellation request"
            job.updated_at = datetime.utcnow()
            cancelled_count += 1
            
        if cancelled_count > 0:
            self.db.commit()
            
        print(f"[cancel_jobs_by_project_id] Cancelled {cancelled_count} jobs for project {project_id}")
        return cancelled_count

# Standalone functions for working with JobsRepository
def update_job_status(job_id, status, message=None, progress=None, result=None, error=None):
    """
    Update the status of a job in the database
    
    Args:
        job_id: ID of the job to update
        status: New status (pending, processing, completed, failed, cancelled)
        message: Optional status message
        progress: Optional progress percentage (0-100)
        result: Optional result dictionary that might contain analysis_id
        error: Optional error message if status is 'failed'
    
    Returns:
        True if job was updated, False otherwise
    """
    from app.db.config.database import SessionLocal
    
    db = SessionLocal()
    try:
        jobs_repo = JobsRepository(db)
        
        # Update database
        analysis_id = None
        if result and 'analysis_id' in result:
            analysis_id = result.get('analysis_id')
            
        db_update_success = jobs_repo.update_job_status(
            job_id=job_id,
            status=status,
            message=message,
            progress=progress,
            error=error,
            analysis_id=analysis_id
        )
        
        return db_update_success
            
    except Exception as e:
        print(f"Error updating job status in database: {str(e)}")
        return False
    finally:
        db.close()