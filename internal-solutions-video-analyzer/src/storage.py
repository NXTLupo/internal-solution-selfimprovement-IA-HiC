import json
import os
import time
from typing import Dict, Optional, List
import aiofiles
import logging
from .models import Job, JobStatus

logger = logging.getLogger("video-analyzer.storage")

class JobStorage:
    """Simple storage for job data with in-memory and file persistence."""
    
    def __init__(self, storage_dir: str = "./storage"):
        self.jobs: Dict[str, Job] = {}
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        logger.info(f"Initialized job storage in {storage_dir}")
        
    async def save_job(self, job: Job) -> None:
        """Save a job to memory and disk."""
        self.jobs[job.id] = job
        job.updated_at = time.time()
        # Persist to disk
        await self._save_to_disk(job)
        logger.debug(f"Saved job {job.id} to storage")
        
    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID, trying memory first then disk."""
        if job_id in self.jobs:
            return self.jobs[job_id]
            
        # Try to load from disk if not in memory
        job = await self._load_from_disk(job_id)
        if job:
            self.jobs[job_id] = job
            logger.debug(f"Loaded job {job_id} from disk")
        else:
            logger.debug(f"Job {job_id} not found")
        return job
    
    async def update_job(self, job_id: str, **updates) -> Optional[Job]:
        """Update a job with the provided fields."""
        job = await self.get_job(job_id)
        if not job:
            logger.warning(f"Attempted to update non-existent job {job_id}")
            return None
            
        for key, value in updates.items():
            if hasattr(job, key):
                setattr(job, key, value)
            else:
                logger.warning(f"Attempted to update unknown field {key} for job {job_id}")
        
        job.updated_at = time.time()
        await self.save_job(job)
        logger.debug(f"Updated job {job_id} with {len(updates)} fields")
        return job
    
    async def list_jobs(self, limit: int = 100, offset: int = 0) -> List[Job]:
        """List jobs, sorted by creation time (newest first)."""
        # Load any jobs from disk that aren't in memory
        await self._load_all_jobs()
        
        jobs = list(self.jobs.values())
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        logger.debug(f"Listed {len(jobs[offset:offset+limit])} jobs (offset={offset}, limit={limit})")
        return jobs[offset:offset+limit]
    
    async def _save_to_disk(self, job: Job) -> None:
        """Save a job to disk as JSON."""
        path = os.path.join(self.storage_dir, f"{job.id}.json")
        try:
            async with aiofiles.open(path, "w") as f:
                await f.write(job.json())
        except Exception as e:
            logger.error(f"Error saving job {job.id} to disk: {str(e)}")
    
    async def _load_from_disk(self, job_id: str) -> Optional[Job]:
        """Load a job from disk by ID."""
        path = os.path.join(self.storage_dir, f"{job_id}.json")
        if not os.path.exists(path):
            return None
            
        try:
            async with aiofiles.open(path, "r") as f:
                content = await f.read()
                return Job.parse_raw(content)
        except Exception as e:
            logger.error(f"Error loading job {job_id} from disk: {str(e)}")
            return None
            
    async def _load_all_jobs(self) -> None:
        """Load all jobs from disk that aren't already in memory."""
        if not os.path.exists(self.storage_dir):
            return
            
        for filename in os.listdir(self.storage_dir):
            if filename.endswith(".json"):
                job_id = filename.replace(".json", "")
                if job_id not in self.jobs:
                    await self._load_from_disk(job_id)

    async def delete_job(self, job_id: str) -> bool:
        """Delete a job from storage."""
        if job_id in self.jobs:
            del self.jobs[job_id]
            
        # Delete from disk if exists
        path = os.path.join(self.storage_dir, f"{job_id}.json")
        if os.path.exists(path):
            try:
                os.remove(path)
                logger.debug(f"Deleted job {job_id}")
                return True
            except Exception as e:
                logger.error(f"Error deleting job {job_id} from disk: {str(e)}")
                return False
        
        return False