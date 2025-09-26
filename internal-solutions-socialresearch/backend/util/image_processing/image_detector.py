import re
from typing import List, Optional
import requests

def is_reddit_image_url(url: str) -> bool:
    """
    Detect if a URL is a Reddit image URL that we should process.
    Focus on direct image URLs, especially i.redd.it URLs, and Reddit galleries.
    
    Args:
        url: The URL to check
        
    Returns:
        bool: True if the URL is a processable image URL
    """
    if not url:
        return False
    
    # Skip preview.redd.it URLs as requested
    if 'preview.redd.it' in url.lower():
        return False
    
    # Check for Reddit gallery URLs (multiple images - we'll take first)
    if 'reddit.com/gallery/' in url.lower():
        return True
    
    # Check for direct image URLs (especially i.redd.it)
    image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg')
    
    # Primary focus: i.redd.it URLs with image extensions
    if 'i.redd.it' in url.lower() and any(url.lower().endswith(ext) for ext in image_extensions):
        return True
    
    # Secondary: Any direct image URL with proper extensions
    if any(url.lower().endswith(ext) for ext in image_extensions):
        return True
    
    return False

def find_image_urls_in_text(text: str) -> List[str]:
    """
    Find all image URLs in a given text.
    Focus on direct image URLs, especially i.redd.it URLs, and Reddit galleries.
    
    Args:
        text: The text to search for image URLs
        
    Returns:
        List[str]: List of found image URLs
    """
    if not text:
        return []
    
    # Simple patterns for direct image URLs and galleries
    image_patterns = [
        r'https://www\.reddit\.com/gallery/[^\s]*',                      # Reddit gallery URLs
        r'https://i\.redd\.it/[^\s]*\.(jpg|jpeg|png|webp|bmp|svg)',      # i.redd.it URLs
        r'https://[^\s]*\.(jpg|jpeg|png|webp|bmp|svg)',                  # Any direct image URL
    ]
    
    found_urls = []
    for pattern in image_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Extract the full URLs (matches might be tuples from capturing groups)
            if 'gallery' in pattern:
                # Gallery pattern returns full URLs directly
                found_urls.extend(matches)
            else:
                # Image patterns might have capturing groups, extract full URLs
                full_matches = re.findall(pattern.replace(r'\.(jpg|jpeg|png|webp|bmp|svg)', r'\.[a-zA-Z]+'), text, re.IGNORECASE)
                found_urls.extend(full_matches)
    
    # Filter out preview.redd.it URLs
    filtered_urls = [url for url in found_urls if 'preview.redd.it' not in url.lower()]
    
    # Remove duplicates while preserving order
    unique_urls = list(dict.fromkeys(filtered_urls))
    
    return unique_urls

def extract_reddit_image_url(reddit_url: str) -> Optional[str]:
    """
    Extract or validate a direct image URL.
    Focus on i.redd.it URLs and avoid preview.redd.it URLs.
    For gallery URLs, extract only the first image.
    
    Args:
        reddit_url: The URL (could be a direct image URL, Reddit post URL, or gallery URL)
        
    Returns:
        Optional[str]: The direct image URL if valid, None otherwise
    """
    # Skip preview.redd.it URLs
    if 'preview.redd.it' in reddit_url.lower():
        return None
    
    # Check if it's already a direct image URL
    image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg')
    if any(reddit_url.lower().endswith(ext) for ext in image_extensions):
        return reddit_url
    
    # Handle Reddit gallery URLs
    if 'reddit.com/gallery/' in reddit_url.lower():
        return extract_from_reddit_gallery(reddit_url)
    
    # If it's a Reddit post URL, try to extract the image from JSON
    if 'reddit.com/r/' in reddit_url and '/comments/' in reddit_url:
        return extract_from_reddit_post(reddit_url)
    
    return None

def extract_from_reddit_gallery(gallery_url: str) -> Optional[str]:
    """
    Extract the first image URL from a Reddit gallery.
    
    Args:
        gallery_url: Reddit gallery URL (e.g., https://www.reddit.com/gallery/1l160b0)
        
    Returns:
        Optional[str]: First image URL if found
    """
    try:
        # Extract post ID from gallery URL
        gallery_id = gallery_url.split('/')[-1]
        
        # Construct post URL to get JSON data
        post_url = f"https://www.reddit.com/comments/{gallery_id}.json"
        
        headers = {
            'User-Agent': 'ImageToText Bot 1.0'
        }
        
        response = requests.get(post_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # Navigate through Reddit's JSON structure
        if isinstance(data, list) and len(data) > 0 and 'data' in data[0]:
            children = data[0]['data'].get('children', [])
            if children and 'data' in children[0]:
                post_data = children[0]['data']
                
                # Check for gallery media_metadata
                if 'media_metadata' in post_data and post_data['media_metadata']:
                    media_items = post_data['media_metadata']
                    
                    # Get the first media item
                    first_media_id = list(media_items.keys())[0]
                    first_media = media_items[first_media_id]
                    
                    # Try to find the best image URL (prefer i.redd.it, allow preview as fallback)
                    best_url = None
                    
                    # Check different resolution options
                    if 'p' in first_media and first_media['p']:
                        # Look through resolutions for i.redd.it URLs first
                        for resolution in first_media['p']:
                            if 'u' in resolution:
                                url = resolution['u'].replace('&amp;', '&')
                                if 'i.redd.it' in url.lower():
                                    return url
                                elif not best_url:  # Store first valid URL as fallback
                                    best_url = url
                    
                    # If no i.redd.it found in resolutions, check the 's' field
                    if 's' in first_media and 'u' in first_media['s']:
                        url = first_media['s']['u'].replace('&amp;', '&')
                        if 'i.redd.it' in url.lower():
                            return url
                        elif not best_url:
                            best_url = url
                    
                    # If we have a preview.redd.it URL, try to convert it to i.redd.it
                    if best_url and 'preview.redd.it' in best_url.lower():
                        # Try to convert preview.redd.it to i.redd.it
                        converted_url = convert_preview_to_direct(best_url)
                        if converted_url:
                            return converted_url
                        else:
                            # Use preview URL as last resort
                            return best_url
                    elif best_url:
                        return best_url
        
        return None
        
    except Exception as e:
        return None

def convert_preview_to_direct(preview_url: str) -> Optional[str]:
    """
    Try to convert a preview.redd.it URL to i.redd.it
    
    Args:
        preview_url: Preview URL like https://preview.redd.it/abc123.png?...
        
    Returns:
        Optional[str]: Converted i.redd.it URL if possible
    """
    if not preview_url or 'preview.redd.it' not in preview_url.lower():
        return None
    
    try:
        # Extract the filename part
        # From: https://preview.redd.it/gproudl76f4f1.png?width=616&format=png...
        # To: https://i.redd.it/gproudl76f4f1.png
        
        # Find the filename with extension
        match = re.search(r'/([^/]+\.(jpg|jpeg|png|webp|bmp|svg))', preview_url.lower())
        if match:
            filename = match.group(1)
            direct_url = f"https://i.redd.it/{filename}"
            return direct_url
            
        return None
        
    except Exception as e:
        return None

def extract_from_reddit_post(reddit_url: str) -> Optional[str]:
    """
    Extract image URL from a Reddit post URL by fetching JSON data.
    
    Args:
        reddit_url: Reddit post URL
        
    Returns:
        Optional[str]: Direct image URL if found
    """
    # Remove any fragments
    clean_url = reddit_url.split('#')[0]
    
    try:
        # Add .json to get the JSON version of the Reddit post
        json_url = clean_url + '.json'
        
        headers = {
            'User-Agent': 'ImageToText Bot 1.0'
        }
        
        response = requests.get(json_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # Navigate through Reddit's JSON structure
        if isinstance(data, list) and len(data) > 0 and 'data' in data[0]:
            children = data[0]['data'].get('children', [])
            if children and 'data' in children[0]:
                post_data = children[0]['data']
                
                # Check the URL field from Reddit
                if 'url' in post_data:
                    reddit_post_url = post_data['url']
                    
                    # Skip preview.redd.it URLs
                    if 'preview.redd.it' in reddit_post_url.lower():
                        return None
                    
                    # Check if it's a direct i.redd.it image URL
                    if 'i.redd.it' in reddit_post_url.lower():
                        image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg')
                        if any(reddit_post_url.lower().endswith(ext) for ext in image_extensions):
                            return reddit_post_url
                    
                    # Check for any direct image URL
                    image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg')
                    if any(reddit_post_url.lower().endswith(ext) for ext in image_extensions):
                        return reddit_post_url
        
        return None
        
    except Exception as e:
        return None

def is_image_url(url: str) -> bool:
    """
    Check if a URL points to an image file.
    
    Args:
        url: The URL to check
        
    Returns:
        bool: True if the URL appears to be an image
    """
    if not url:
        return False
        
    # Check for common image file extensions
    image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg')
    return url.lower().endswith(image_extensions) 