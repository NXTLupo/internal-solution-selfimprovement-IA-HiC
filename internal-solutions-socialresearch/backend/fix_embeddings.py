#!/usr/bin/env python3
"""
Script to fix missing embeddings in the Social Research Analytics database.
This ensures that all Reddit posts have proper vector embeddings for the Ask AI feature.
"""

import os
import sys
import logging
from pathlib import Path

# Add the parent directory to the path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import required modules
from app.db.config.database import SessionLocal
from app.db.models.reddit_models import RedditPost, RedditComment
from util.llm_models.pgvector.pgvector import (
    create_pgvector_tables,
    store_reddit_data_in_pgvector,
    get_sentence_transformer
)
from sqlalchemy import text, func

def check_embeddings_status():
    """Check the current status of embeddings in the database."""
    db = SessionLocal()
    try:
        # Check if the embeddings table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'reddit_embeddings'
            )
        """))
        table_exists = result.scalar()

        if not table_exists:
            logger.info("Embeddings table does not exist.")
            return 0, []

        # Count existing embeddings
        result = db.execute(text("SELECT COUNT(*) FROM reddit_embeddings"))
        embedding_count = result.scalar()

        # Get unique subreddits with embeddings
        result = db.execute(text("""
            SELECT DISTINCT subreddit
            FROM reddit_embeddings
            ORDER BY subreddit
        """))
        subreddits_with_embeddings = [row[0] for row in result]

        return embedding_count, subreddits_with_embeddings

    finally:
        db.close()

def get_posts_without_embeddings():
    """Get all posts that don't have embeddings yet."""
    db = SessionLocal()
    try:
        # Get all unique subreddits from posts
        result = db.execute(text("""
            SELECT DISTINCT subreddit
            FROM reddit_posts
            ORDER BY subreddit
        """))
        all_subreddits = [row[0] for row in result]

        # Get posts without embeddings
        result = db.execute(text("""
            SELECT p.id, p.subreddit, p.title, p.content
            FROM reddit_posts p
            LEFT JOIN reddit_embeddings e ON p.id = e.post_id
            WHERE e.post_id IS NULL
        """))

        posts_without_embeddings = [dict(row) for row in result]

        return all_subreddits, posts_without_embeddings

    finally:
        db.close()

def create_embeddings_for_subreddit(subreddit: str):
    """Create embeddings for all posts in a subreddit."""
    db = SessionLocal()
    try:
        logger.info(f"Creating embeddings for subreddit: {subreddit}")

        # Get all posts for this subreddit
        posts = db.query(RedditPost).filter(
            func.lower(RedditPost.subreddit) == subreddit.lower()
        ).all()

        if not posts:
            logger.warning(f"No posts found for subreddit: {subreddit}")
            return 0

        # Convert posts to the format expected by store_reddit_data_in_pgvector
        reddit_data = []
        for post in posts:
            post_data = {
                'id': post.id,
                'title': post.title,
                'content': post.content or post.selftext or '',
                'author': post.author,
                'score': post.score,
                'created_utc': post.created_utc,
                'num_comments': post.num_comments,
                'url': post.url,
                'permalink': post.permalink,
                'subreddit': post.subreddit
            }
            reddit_data.append(post_data)

        # Store embeddings
        count = store_reddit_data_in_pgvector(subreddit, reddit_data)
        logger.info(f"Created {count} embeddings for subreddit: {subreddit}")

        return count

    except Exception as e:
        logger.error(f"Error creating embeddings for {subreddit}: {e}")
        return 0
    finally:
        db.close()

def main():
    """Main function to fix missing embeddings."""
    print("\n" + "="*60)
    print("Social Research Analytics - Fix Embeddings")
    print("="*60 + "\n")

    # Check current status
    embedding_count, subreddits_with_embeddings = check_embeddings_status()
    print(f"Current embeddings count: {embedding_count}")

    if subreddits_with_embeddings:
        print(f"Subreddits with embeddings: {', '.join(subreddits_with_embeddings)}")
    else:
        print("No subreddits have embeddings yet.")

    # Create tables if they don't exist
    if embedding_count == 0:
        print("\nCreating PGVector tables...")
        if create_pgvector_tables():
            print("✓ PGVector tables created successfully")
        else:
            print("✗ Failed to create PGVector tables")
            return

    # Get posts without embeddings
    all_subreddits, posts_without_embeddings = get_posts_without_embeddings()

    print(f"\nTotal subreddits in database: {len(all_subreddits)}")
    print(f"Posts without embeddings: {len(posts_without_embeddings)}")

    if not posts_without_embeddings:
        print("\n✓ All posts already have embeddings!")
        return

    # Group posts by subreddit
    posts_by_subreddit = {}
    for post in posts_without_embeddings:
        sub = post['subreddit']
        if sub not in posts_by_subreddit:
            posts_by_subreddit[sub] = []
        posts_by_subreddit[sub].append(post)

    print(f"\nSubreddits needing embeddings: {', '.join(posts_by_subreddit.keys())}")

    # Ask user to proceed
    response = input("\nDo you want to create embeddings for these posts? (y/n): ")
    if response.lower() != 'y':
        print("Aborted.")
        return

    # Create embeddings for each subreddit
    print("\nCreating embeddings...")
    total_created = 0

    for subreddit in posts_by_subreddit:
        count = create_embeddings_for_subreddit(subreddit)
        total_created += count

    print(f"\n✓ Created {total_created} embeddings total")

    # Verify final status
    final_count, final_subreddits = check_embeddings_status()
    print(f"\nFinal embeddings count: {final_count}")
    print(f"Subreddits with embeddings: {', '.join(final_subreddits)}")

    print("\n" + "="*60)
    print("Embedding Fix Complete!")
    print("The Ask AI feature should now have access to post content.")
    print("="*60)

if __name__ == "__main__":
    main()