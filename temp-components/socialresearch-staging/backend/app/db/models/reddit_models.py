from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.db.config.database import Base
from sqlalchemy.dialects.postgresql import ARRAY

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)  # UUID
    username = Column(String, nullable=False, unique=True)
    
    # Relationship to analysis results
    analysis_results = relationship("RedditAnalysisResult", back_populates="user")

class RedditSearch(Base):
    __tablename__ = "reddit_searches"

    id = Column(String, primary_key=True)  # UUID
    subreddit = Column(String, nullable=False)
    query = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    parameters = Column(JSON, nullable=True)
    
    # Relationships
    posts = relationship("RedditPost", back_populates="search", cascade="all, delete-orphan")

class RedditPost(Base):
    __tablename__ = "reddit_posts"

    id = Column(String, primary_key=True)  # Reddit post ID
    search_id = Column(String, ForeignKey("reddit_searches.id", ondelete="CASCADE"), nullable=False)
    subreddit = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    created_utc = Column(Float, nullable=True)
    url = Column(String, nullable=True)
    permalink = Column(String, nullable=True)
    num_comments = Column(Integer, nullable=True)
    author = Column(String, nullable=True)
    
    # Relationships
    search = relationship("RedditSearch", back_populates="posts")
    comments = relationship("RedditComment", back_populates="post", cascade="all, delete-orphan")

class RedditComment(Base):
    __tablename__ = "reddit_comments"

    id = Column(String, primary_key=True)  # Reddit comment ID
    post_id = Column(String, ForeignKey("reddit_posts.id", ondelete="CASCADE"), nullable=False)
    parent_comment_id = Column(String, ForeignKey("reddit_comments.id", ondelete="CASCADE"), nullable=True)
    body = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    created_utc = Column(Float, nullable=True)
    author = Column(String, nullable=True)
    
    # Relationships
    post = relationship("RedditPost", back_populates="comments")
    # Self-referential relationship for comment threads
    replies = relationship("RedditComment", 
                          backref=backref("parent", remote_side=[id]),
                          cascade="all, delete-orphan")
    
class RedditTopicModel(Base):
    __tablename__ = "reddit_topic_models"

    id = Column(String, primary_key=True)
    subreddit = Column(String, nullable=False)
    topic_model = Column(JSON, nullable=True)
    
class RedditAnalysisResult(Base):
    __tablename__ = "reddit_results"
    
    id = Column(String, primary_key=True)  # UUID
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    type = Column(String, nullable=False)  # 'sentiment' or 'topic'
    
    subreddit = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    post_count = Column(Integer, nullable=True)
    sort_by = Column(String, nullable=True)
    time_period = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    startDate = Column(String, nullable=True)
    endDate = Column(String, nullable=True)

    summary = Column(JSON, nullable=True)
    data = Column(JSON, nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="analysis_results")
    
    # Relationship to jobs
    jobs = relationship("RedditJobStatus", back_populates="analysis_result", cascade="all, delete-orphan")

class RedditJobStatus(Base):
    __tablename__ = "reddit_jobs"
    
    id = Column(String, primary_key=True)  # UUID for job_id
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    analysis_id = Column(String, ForeignKey("reddit_results.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String, nullable=False)  # pending, processing, completed, failed, cancelled
    message = Column(String, nullable=True)
    progress = Column(Integer, nullable=True)  # 0-100
    error = Column(Text, nullable=True)
    
    parameters = Column(JSON, nullable=True)  # Store job parameters
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    analysis_result = relationship("RedditAnalysisResult", back_populates="jobs")


