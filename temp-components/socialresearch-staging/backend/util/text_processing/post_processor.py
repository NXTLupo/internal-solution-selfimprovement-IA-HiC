from nltk.tokenize import word_tokenize, RegexpTokenizer
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import re
import nltk
import html
from datetime import datetime

# Download all required NLTK data
required_nltk_data = [
    'punkt',
    'stopwords',
    'wordnet',
    'omw-1.4'
]

for item in required_nltk_data:
    try:
        nltk.download(item, quiet=True)
    except Exception as e:
        print(f"Error downloading {item}: {str(e)}")

class TextProcessor:
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        # Use RegexpTokenizer instead of word_tokenize to avoid punkt_tab dependency
        self.tokenizer = RegexpTokenizer(r'\w+')

    def clean_text(self, text: str) -> str:
        if not isinstance(text, str):
            return ""
            
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove HTML tags
        text = html.unescape(text)
        text = re.sub(r'<.*?>', '', text)
        
        # Remove special characters but keep numbers
        text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text

    def process_text(self, text: str) -> str:
        try:
            # Clean the text first
            cleaned_text = self.clean_text(text)
            
            # Use RegexpTokenizer instead of word_tokenize
            tokens = self.tokenizer.tokenize(cleaned_text)
            
            # Return the processed text
            return ' '.join(tokens)
        except Exception as e:
            print(f"Error in process_text: {str(e)}")
            return text  # Return original text if processing fails

    def format_date(self, date_str: str) -> str:
        """Format datetime string to YYYY-MM-DD"""
        try:
            # Parse the datetime string
            dt = datetime.fromisoformat(date_str)
            # Return only the date part
            return dt.strftime('%Y-%m-%d')
        except Exception as e:
            print(f"Error formatting date {date_str}: {str(e)}")
            return date_str

    def process_reddit_data(self, data: dict) -> dict:
        try:
            processed_data = data.copy()
            
            # Process posts
            if 'results' in processed_data:
                for post in processed_data['results']:
                    # Process title and selftext
                    if 'title' in post:
                        post['title'] = self.process_text(post.get('title', ''))
                    if 'selftext' in post:
                        # Check selftext length and set to empty if > 1000 chars
                        if len(post.get('selftext', '')) > 1000:
                            post['selftext'] = ""
                        else:
                            post['selftext'] = self.process_text(post.get('selftext', ''))
                    
                    # Format the created_utc date
                    if 'created_utc' in post:
                        post['created_utc'] = self.format_date(post['created_utc'])
                    
                    # Process comments and remove if empty
                    if 'comments' in post:
                        if not post['comments']:
                            del post['comments']
                        else:
                            self._process_comments(post['comments'])
            
            return processed_data
        except Exception as e:
            print(f"Error in process_reddit_data: {str(e)}")
            return data

    def _process_comments(self, comments: list):
        try:
            # Process each comment and track indices to remove
            i = 0
            while i < len(comments):
                comment = comments[i]
                # Process comment body
                if 'body' in comment:
                    # Check body length and set to empty if > 1000 chars
                    if len(comment.get('body', '')) > 1000:
                        comment['body'] = ""
                    else:
                        comment['body'] = self.process_text(comment.get('body', ''))
                
                # Format the created_utc date
                if 'created_utc' in comment:
                    comment['created_utc'] = self.format_date(comment['created_utc'])
                
                # Process replies recursively and remove if empty
                if 'replies' in comment:
                    if not comment['replies']:
                        del comment['replies']
                    else:
                        self._process_comments(comment['replies'])
                i += 1
        except Exception as e:
            print(f"Error in _process_comments: {str(e)}")

    def format_filtered_data(self, data: dict) -> dict:
        """Format filtered data into a readable text format"""
        try:
            posts = data.get('results', [])
            formatted_data = {}
            
            for i, post in enumerate(posts, 1):
                post_content = f"Title: {post.get('title', '')}\n"
                post_content += f"Content: {post.get('selftext', '')}\n"
                post_content += f"Score: {post.get('score', 0)}\n"
                
                if 'comments' in post and post['comments']:
                    post_content += "Top Comments:\n"
                    for comment in post['comments']:
                        comment_text = comment.get('body', '')
                        if comment_text:
                            post_content += f"- {comment_text}\n"
                            if 'replies' in comment and comment['replies']:
                                for reply in comment['replies']:
                                    post_content += f"  - {reply.get('body', '')}\n"
                
                formatted_data[f"post {i}"] = post_content
            
            return formatted_data
            
        except Exception as e:
            print(f"Error in format_filtered_data: {str(e)}")
            return data 