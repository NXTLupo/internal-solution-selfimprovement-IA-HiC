import sys
import time
from pathlib import Path
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Event

from util.image_processing.content_processor import RedditContentProcessor

class RedditImageBatchProcessor:
    """
    Batch processor for handling multiple Reddit image URLs with embedded limits.
    """
    MAX_CONCURRENT_IMAGES = 3
    IMAGE_PROCESSING_TIMEOUT = 30  
    RATE_LIMIT_DELAY = 1.0  # seconds between batches
    
    def __init__(self):
        self.content_processor = RedditContentProcessor()
        self.processing_stats = {
            'total_posts': 0,
            'posts_with_images': 0,
            'image_urls_found': 0,
            'image_urls_processed': 0,
            'image_urls_failed': 0,
            'processing_time': 0.0
        }
        
    def process_posts_batch(self, posts_data: List[Dict], cancel_event: Optional[Event] = None) -> List[Dict]:
        """
        Process a batch of posts for image URLs with parallel processing.
        
        Args:
            posts_data: List of post dictionaries to process
            cancel_event: Optional cancellation event
            
        Returns:
            List[Dict]: Processed posts with image descriptions
        """
        start_time = time.time()
        processed_posts = []
        
        self.processing_stats['total_posts'] = len(posts_data)
        
        # Group posts by those with and without image URLs for efficient processing
        posts_with_images = []
        posts_without_images = []
        
        for post in posts_data:
            if self._post_has_image_urls(post):
                posts_with_images.append(post)
                self.processing_stats['posts_with_images'] += 1
            else:
                posts_without_images.append(post)
        
        # Process posts without image URLs first (fast path)
        processed_posts.extend(posts_without_images)
        
        # Process posts with image URLs in batches
        if posts_with_images:
            batch_size = self.MAX_CONCURRENT_IMAGES
            
            for i in range(0, len(posts_with_images), batch_size):
                # Check for cancellation
                if cancel_event and cancel_event.is_set():
                    break
                    
                batch = posts_with_images[i:i + batch_size]
                processed_batch = self._process_batch_parallel(batch, cancel_event)
                processed_posts.extend(processed_batch)
                
                # Rate limiting between batches
                if i + batch_size < len(posts_with_images):
                    time.sleep(self.RATE_LIMIT_DELAY)
        
        # Update processing stats
        self.processing_stats['processing_time'] = time.time() - start_time
        processor_stats = self.content_processor.get_processing_stats()
        self.processing_stats.update({
            'image_urls_found': processor_stats['total_processed'],
            'image_urls_processed': processor_stats['successful'],
            'image_urls_failed': processor_stats['failed']
        })
        
        return processed_posts
        
    def _process_batch_parallel(self, batch: List[Dict], cancel_event: Optional[Event] = None) -> List[Dict]:
        """
        Process a batch of posts in parallel with embedded timeout.
        
        Args:
            batch: List of posts to process
            cancel_event: Optional cancellation event
            
        Returns:
            List[Dict]: Processed posts
        """
        processed_batch = []
        
        with ThreadPoolExecutor(max_workers=self.MAX_CONCURRENT_IMAGES) as executor:
            # Submit all posts for processing
            future_to_post = {
                executor.submit(self._process_single_post_with_timeout, post): post 
                for post in batch
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_post, timeout=self.IMAGE_PROCESSING_TIMEOUT):
                # Check for cancellation
                if cancel_event and cancel_event.is_set():
                    break
                    
                try:
                    processed_post = future.result(timeout=5)  # Additional per-future timeout
                    processed_batch.append(processed_post)
                except Exception as e:
                    # If processing fails, return original post
                    original_post = future_to_post[future]
                    processed_batch.append(original_post)
        
        return processed_batch
        
    def _process_single_post_with_timeout(self, post_data: Dict) -> Dict:
        """
        Process a single post with timeout protection.
        
        Args:
            post_data: Post dictionary to process
            
        Returns:
            Dict: Processed post data
        """
        try:
            # Process the post content
            processed_post = self.content_processor.process_post_content(post_data)
            
            # Process comments if they exist
            if 'comments' in processed_post and processed_post['comments']:
                processed_comments = []
                for comment in processed_post['comments']:
                    processed_comment = self.content_processor.process_comment_content(comment)
                    processed_comments.append(processed_comment)
                processed_post['comments'] = processed_comments
                
            return processed_post
            
        except Exception as e:
            return post_data  # Return original if processing fails
            
    def _post_has_image_urls(self, post_data: Dict) -> bool:
        """
        Check if a post contains any image URLs.
        
        Args:
            post_data: Post dictionary to check
            
        Returns:
            bool: True if post contains image URLs
        """
        from util.image_processing.image_detector import find_image_urls_in_text, is_reddit_image_url
        
        # Check title
        if post_data.get('title'):
            if find_image_urls_in_text(post_data['title']):
                return True
                
        # Check content
        if post_data.get('content'):
            if find_image_urls_in_text(post_data['content']):
                return True
                
        # Check URL field
        if post_data.get('url') and is_reddit_image_url(post_data['url']):
            return True
            
        # Check comments
        if post_data.get('comments'):
            for comment in post_data['comments']:
                if self._comment_has_image_urls(comment):
                    return True
                    
        return False
        
    def _comment_has_image_urls(self, comment_data: Dict) -> bool:
        """
        Recursively check if a comment contains image URLs.
        
        Args:
            comment_data: Comment dictionary to check
            
        Returns:
            bool: True if comment contains image URLs
        """
        from util.image_processing.image_detector import find_image_urls_in_text
        
        # Check comment body
        if comment_data.get('body'):
            if find_image_urls_in_text(comment_data['body']):
                return True
                
        # Check replies recursively
        if comment_data.get('replies'):
            for reply in comment_data['replies']:
                if self._comment_has_image_urls(reply):
                    return True
                    
        return False
        
    def get_processing_stats(self) -> Dict[str, any]:
        """
        Get comprehensive processing statistics.
        
        Returns:
            dict: Processing statistics
        """
        return self.processing_stats.copy()
        
    def reset_stats(self):
        """Reset processing statistics."""
        self.processing_stats = {
            'total_posts': 0,
            'posts_with_images': 0,
            'image_urls_found': 0,
            'image_urls_processed': 0,
            'image_urls_failed': 0,
            'processing_time': 0.0
        }
        self.content_processor.processed_urls.clear() 