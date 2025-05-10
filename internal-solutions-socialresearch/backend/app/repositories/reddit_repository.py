from sqlalchemy.orm import Session
from app.db.models.reddit_models import RedditSearch, RedditPost, RedditComment, RedditAnalysisResult, RedditJobStatus
from typing import Dict, List, Any, Optional
import json
from datetime import datetime
import uuid

class RedditRepository:
    def __init__(self, db: Session):
        self.db = db

    def save_search(self, search_id: str, subreddit: str, query: str, parameters: Dict) -> RedditSearch:
        """Save a new Reddit search to the database."""
        search = RedditSearch(
            id=search_id,
            subreddit=subreddit,
            query=query,
            parameters=parameters,
            created_at=datetime.utcnow()
        )
        self.db.add(search)
        self.db.commit()
        self.db.refresh(search)
        return search

    def save_posts(self, search_id: str, posts_data: List[Dict]) -> List[RedditPost]:
        """Save Reddit posts for a search, avoiding duplicates using upsert pattern."""
        posts = []
        
        print(f"Attempting to save {len(posts_data)} posts for search ID: {search_id}")
        new_count = 0
        update_count = 0
        
        for post_data in posts_data:
            post_id = post_data.get('id')
            if not post_id:
                print(f"Skipping post without ID")
                continue  # Skip posts without ID
            
            # Extract subreddit from permalink if not directly provided
            subreddit = post_data.get('subreddit')
            if not subreddit and post_data.get('permalink'):
                permalink = post_data.get('permalink', '')
                # Extract subreddit from permalink format like "/r/ouraring/comments/..."
                parts = permalink.split('/')
                for i, part in enumerate(parts):
                    if part == 'r' and i+1 < len(parts):
                        subreddit = parts[i+1]
                        break
            
            # Check if post exists
            existing_post = self.db.query(RedditPost).filter(
                RedditPost.id == post_id
            ).first()
            
            if existing_post:
                update_count += 1
                # Update existing post with new search_id
                # This is important - we're associating the post with the new search
                existing_post.search_id = search_id
                existing_post.title = post_data.get('title', existing_post.title)
                existing_post.content = post_data.get('selftext', post_data.get('content', existing_post.content))
                existing_post.score = post_data.get('score', existing_post.score)
                existing_post.created_utc = post_data.get('created_utc', existing_post.created_utc)
                existing_post.url = post_data.get('url', existing_post.url)
                existing_post.permalink = post_data.get('permalink', existing_post.permalink)
                existing_post.num_comments = post_data.get('num_comments', existing_post.num_comments)
                existing_post.author = str(post_data.get('author')) if post_data.get('author') else existing_post.author
                existing_post.subreddit = subreddit or existing_post.subreddit
                
                post = existing_post
            else:
                new_count += 1
                print(f"Saving new post: {post_id}")
                # Create new post
                post = RedditPost(
                    id=post_id,
                    search_id=search_id,
                    title=post_data.get('title', ''),
                    content=post_data.get('selftext', post_data.get('content', '')),
                    score=post_data.get('score'),
                    created_utc=post_data.get('created_utc'),
                    url=post_data.get('url'),
                    permalink=post_data.get('permalink'),
                    num_comments=post_data.get('num_comments'),
                    author=str(post_data.get('author')) if post_data.get('author') else None,
                    subreddit=subreddit or post_data.get('subreddit', '').lower()
                )
                self.db.add(post)
            
            self.db.flush()  # Flush to get the ID without committing
            posts.append(post)
            
            # Save comments for this post
            if 'comments' in post_data and post_data['comments']:
                self._save_comments(post.id, post_data['comments'])
        
        try:
            print(f"Committing to database: {new_count} new posts, {update_count} updated posts")
            self.db.commit()
            print("Commit successful")
        except Exception as e:
            self.db.rollback()
            print(f"Error saving posts: {str(e)}")
            raise
        
        return posts

    def _save_comments(self, post_id: str, comments_data: List[Dict], parent_comment_id: str = None):
        """Recursively save comments and their replies."""
        
        for comment_data in comments_data:
            comment_id = comment_data.get('id')
            if not comment_id:
                continue  # Skip comments without ID
                        
            # Check if comment exists
            existing_comment = self.db.query(RedditComment).filter(
                RedditComment.id == comment_id
            ).first()
            
            if existing_comment:
                # Update existing comment
                existing_comment.post_id = post_id
                existing_comment.parent_comment_id = parent_comment_id
                existing_comment.body = comment_data.get('body', existing_comment.body)
                existing_comment.score = comment_data.get('score', existing_comment.score)
                existing_comment.created_utc = comment_data.get('created_utc', existing_comment.created_utc)
                existing_comment.author = str(comment_data.get('author')) if comment_data.get('author') else existing_comment.author
                comment = existing_comment
            else:
                # Create new comment
                comment = RedditComment(
                    id=comment_id,
                    post_id=post_id,
                    parent_comment_id=parent_comment_id,
                    body=comment_data.get('body', ''),
                    score=comment_data.get('score'),
                    created_utc=comment_data.get('created_utc'),
                    author=str(comment_data.get('author')) if comment_data.get('author') else None
                )
                self.db.add(comment)
            
            self.db.flush()  # Flush to get the ID
            
            # Recursively save replies if they exist
            if 'replies' in comment_data and comment_data['replies']:
                self._save_comments(post_id, comment_data['replies'], comment_id)

    def get_search_by_id(self, search_id: str) -> Optional[RedditSearch]:
        """Get a search by its ID."""
        return self.db.query(RedditSearch).filter(RedditSearch.id == search_id).first()

    def get_posts_by_search_id(self, search_id: str) -> List[RedditPost]:
        """Get all posts for a search."""
        return self.db.query(RedditPost).filter(RedditPost.search_id == search_id).all()

    def get_all_searches(self) -> List[RedditSearch]:
        """Get all searches."""
        return self.db.query(RedditSearch).order_by(RedditSearch.created_at.desc()).all()

    def get_searches_by_subreddit(self, subreddit: str) -> List[RedditSearch]:
        """Get all searches for a specific subreddit."""
        return self.db.query(RedditSearch).filter(RedditSearch.subreddit == subreddit).all() 
    
    def get_posts_by_ids(self, post_ids: List[str]) -> List[RedditPost]:
        """Get posts by their IDs."""
        if not post_ids:
            return []
        
        # Limit the number of posts to retrieve to avoid performance issues
        max_posts = 100
        post_ids = post_ids[:max_posts]
        
        # Query posts with their comments
        posts = self.db.query(RedditPost).filter(
            RedditPost.id.in_(post_ids)
        ).all()
        
        # Sort posts to match the order of post_ids
        post_dict = {post.id: post for post in posts}
        sorted_posts = [post_dict[post_id] for post_id in post_ids if post_id in post_dict]
        
        return sorted_posts

    def save_analysis_result(
        self, 
        user_id: str, 
        data: Dict, 
        analysis_type: str,
        subreddit: str,
        topic: str,
        post_count: int,
        sort_by: str,
        time_period: str,
        project_id: str = None
    ) -> str:
        """
        Save or update a Reddit analysis result.
        
        Args:
            user_id: The ID of the user who created the analysis
            data: The analysis data to save
            analysis_type: The type of analysis (e.g., 'sentiment')
            subreddit: The subreddit analyzed
            topic: The topic/application name
            post_count: Number of posts analyzed
            sort_by: How posts were sorted
            time_period: Time period for the analysis
            project_id: Optional ID for updating existing analysis
            
        Returns:
            The ID of the saved analysis
        """
        if project_id:
            # Try to update existing project
            project = self.db.query(RedditAnalysisResult).filter(
                RedditAnalysisResult.id == project_id
            ).first()
            
            if project:
                project.data = data
                project.subreddit = subreddit
                project.topic = topic
                project.post_count = post_count
                project.sort_by = sort_by
                project.time_period = time_period
                analysis_id = project_id
            else:
                # If project doesn't exist, create a new one
                analysis_id = str(uuid.uuid4())
                project = RedditAnalysisResult(
                    id=analysis_id,
                    user_id=user_id,
                    data=data,
                    type=analysis_type,
                    subreddit=subreddit,
                    topic=topic,
                    post_count=post_count,
                    sort_by=sort_by,
                    time_period=time_period
                )
                self.db.add(project)
        else:
            # Create a new project
            analysis_id = str(uuid.uuid4())
            project = RedditAnalysisResult(
                id=analysis_id,
                user_id=user_id,
                data=data,
                type=analysis_type,
                subreddit=subreddit,
                topic=topic,
                post_count=post_count,
                sort_by=sort_by,
                time_period=time_period
            )
            self.db.add(project)
        
        self.db.commit()
        return analysis_id

    def update_analysis_summary(self, analysis_id, summary_data):
        """Update the summary field of a RedditAnalysisResult"""
        print(f"[update_analysis_summary] Updating summary for analysis ID: {analysis_id}")
        analysis = self.db.query(RedditAnalysisResult).filter(RedditAnalysisResult.id == analysis_id).first()
        if analysis:
            print(f"[update_analysis_summary] Found analysis, updating summary")
            analysis.summary = summary_data
            return True
        else:
            print(f"[update_analysis_summary] No analysis found with ID: {analysis_id}")
        return False

    def get_latest_analysis_by_project(self, project_id):
        """Get the most recent analysis result for a project"""
        return (self.db.query(RedditAnalysisResult)
                .filter(RedditAnalysisResult.project_id == project_id)
                .order_by(RedditAnalysisResult.created_at.desc())
                .first())

    def get_analysis_by_id(self, analysis_id):
        """Get an analysis result by its ID"""
        print(f"[get_analysis_by_id] Looking up analysis with ID: {analysis_id}")
        result = self.db.query(RedditAnalysisResult).filter(RedditAnalysisResult.id == analysis_id).first()
        if result:
            print(f"[get_analysis_by_id] Found analysis with ID: {analysis_id}")
            print(f"[get_analysis_by_id] Analysis type: {result.type}")
            print(f"[get_analysis_by_id] Analysis created at: {result.created_at}")
            print(f"[get_analysis_by_id] Analysis has summary: {result.summary is not None}")
        else:
            print(f"[get_analysis_by_id] No analysis found with ID: {analysis_id}")
        return result