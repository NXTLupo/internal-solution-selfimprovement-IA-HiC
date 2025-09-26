from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditJobStatus
from datetime import datetime

# Connect to DB
db = SessionLocal()
try:
    # Find stuck jobs
    stuck_jobs = db.query(RedditJobStatus).filter(RedditJobStatus.status == "processing").all()
    print(f"Found {len(stuck_jobs)} jobs stuck in processing state")
    
    # Update each job
    for job in stuck_jobs:
        old_status = job.status
        job.status = "completed"
        job.progress = 100
        job.message = "Analysis completed successfully (fixed)"
        job.updated_at = datetime.utcnow()
        print(f"Updating job {job.id}: {old_status} -> completed")
    
    # Commit changes
    db.commit()
    print("Successfully updated all stuck jobs")
except Exception as e:
    db.rollback()
    print(f"Error: {str(e)}")
finally:
    db.close()
