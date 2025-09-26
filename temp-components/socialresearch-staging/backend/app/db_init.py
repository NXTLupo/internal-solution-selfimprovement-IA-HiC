from app.db.config.database import Base, engine, SessionLocal
import logging
from util.llm_models.pgvector.pgvector import clear_pgvector_data
from app.db.models.reddit_models import User, RedditPost

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db():
    """Initialize the database by creating all tables."""
    # Base.metadata.drop_all(bind=engine)
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Create default user
    db = SessionLocal()
    try:
        # Check if user already exists
        default_user = db.query(User).filter(User.id == '123').first()
        if not default_user:
            default_user = User(id='123', username='liheng')
            db.add(default_user)
            db.commit()
            logger.info("Default user 'liheng' created successfully!")
        else:
            logger.info("Default user 'liheng' already exists.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating default user: {str(e)}")
    finally:
        db.close()
        
    logger.info("Database tables created successfully!")
    

if __name__ == "__main__":
    # clear_pgvector_data()
    init_db() 
    