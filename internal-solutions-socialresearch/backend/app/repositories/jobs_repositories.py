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
    
    def create_job(self, job_id: str, user_id: str, parameters: Dict) -> RedditJobStatus:
        """
        Create a new job in the database
        
        Args:
            job_id: Unique identifier for the job
            user_id: The ID of the user who created the job
            parameters: Job configuration parameters (should contain search_id if needed)
            
        Returns:
            The created job object
        """
        # Get search_id from parameters if it exists, for logging purposes
        search_id = parameters.get('search_id', 'unknown')
        print(f"[create_job] Creating job {job_id} for user {user_id}, search {search_id}")
        
        job = RedditJobStatus(
            id=job_id,
            user_id=user_id,
            status="pending",
            message="Job submitted and queued for processing",
            parameters=parameters,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        
        print(f"[create_job] Created job with ID: {job.id}")
        return job
    
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