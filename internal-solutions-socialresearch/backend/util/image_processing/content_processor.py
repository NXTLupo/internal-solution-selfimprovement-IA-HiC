import sys
from pathlib import Path
from typing import Dict, List, Optional

# Set up path to import from backend utilities
current_dir = Path(__file__).parent
backend_dir = current_dir.parent.parent
sys.path.insert(0, str(backend_dir))

from util.image_processing.image_detector import (
    find_image_urls_in_text, 
    extract_reddit_image_url,
    is_reddit_image_url
)
from util.llm_models.openai import get_image_description_completion
from util.prompts.topic_prompt import get_image_description_prompt

class RedditContentProcessor:
    """
    Processes Reddit content to replace image URLs with descriptions.
    
    Supports multiple image URL formats:
    - Direct image URLs: https://i.redd.it/abc123.jpg
    - Gallery URLs: https://www.reddit.com/gallery/1l160b0 (processes first image only)
    - Reddit post URLs with images: https://www.reddit.com/r/sub/comments/id/title/
    
    Skips preview.redd.it URLs as openai dont accept them.
    """
    
    def __init__(self):
        self.processed_urls = {}  # Cache for processed URLs
        
    def process_post_content(self, post_data: dict) -> dict:
        """
        Process post title, content, and URL field for image URLs.
        
        Args:
            post_data: Dictionary containing post data
            
        Returns:
            dict: Updated post data with image descriptions
        """
        processed_post = post_data.copy()
        
        # Process title
        if 'title' in processed_post and processed_post['title']:
            processed_post['title'] = self._process_text_with_image_urls(processed_post['title'])
            
        # Process content
        if 'content' in processed_post and processed_post['content']:
            processed_post['content'] = self._process_text_with_image_urls(processed_post['content'])
            
        # Process URL field if it's an image URL
        if 'url' in processed_post and is_reddit_image_url(processed_post['url']):
            description = self._get_image_description(processed_post['url'])
            if description:
                if processed_post.get('content'):
                    processed_post['content'] += f" {description}"
                else:
                    processed_post['content'] = description
                    
        return processed_post
        
    def process_comment_content(self, comment_data: dict) -> dict:
        """
        Process comment body for image URLs.
        
        Args:
            comment_data: Dictionary containing comment data
            
        Returns:
            dict: Updated comment data with image descriptions
        """
        processed_comment = comment_data.copy()
        
        # Process comment body
        if 'body' in processed_comment and processed_comment['body']:
            processed_comment['body'] = self._process_text_with_image_urls(processed_comment['body'])
            
        # Process replies recursively
        if 'replies' in processed_comment and processed_comment['replies']:
            processed_replies = []
            for reply in processed_comment['replies']:
                processed_reply = self.process_comment_content(reply)
                processed_replies.append(processed_reply)
            processed_comment['replies'] = processed_replies
            
        return processed_comment
        
    def _process_text_with_image_urls(self, text: str) -> str:
        """
        Replace image URLs in text with image descriptions.
        
        Args:
            text: The text to process
            
        Returns:
            str: Text with image URLs replaced by descriptions
        """
        if not text:
            return text
            
        # Find all image URLs in the text
        image_urls = find_image_urls_in_text(text)
        
        if not image_urls:
            return text
            
        processed_text = text
        
        # Replace each image URL with its description
        for image_url in image_urls:
            description = self._get_image_description(image_url)
            if description:
                # Replace the image URL with the description directly
                processed_text = processed_text.replace(image_url, description)
                
        return processed_text
        
    def _get_image_description(self, image_url: str) -> Optional[str]:
        """
        Extract and describe image from image URL.
        
        Args:
            image_url: The image URL
            
        Returns:
            Optional[str]: Image description or None if processing failed
        """
        # Check cache first
        if image_url in self.processed_urls:
            return self.processed_urls[image_url]
            
        try:
            # Extract the actual image URL (or validate if it's already direct)
            image_url = extract_reddit_image_url(image_url)
            
            if not image_url:
                self.processed_urls[image_url] = None
                return None
                
            # Get image description using GPT-4o
            prompt_text = get_image_description_prompt()
            description = get_image_description_completion(image_url, prompt_text)
            
            if description:
                # Cache the result
                self.processed_urls[image_url] = description
                return description
            else:
                self.processed_urls[image_url] = None
                return None
                
        except Exception as e:
            self.processed_urls[image_url] = None
            return None
            
    def get_processing_stats(self) -> Dict[str, int]:
        """
        Get statistics about processed URLs.
        
        Returns:
            dict: Statistics about processing
        """
        total_processed = len(self.processed_urls)
        successful = sum(1 for desc in self.processed_urls.values() if desc is not None)
        failed = total_processed - successful
        
        return {
            'total_processed': total_processed,
            'successful': successful,
            'failed': failed
        } 