import json
from transformers import pipeline
import os

class FilteringRoBERTa:
    def __init__(self):
        try:
            print("[FilteringRoBERTa] Initializing RoBERTa model...")
            model_name = "cardiffnlp/twitter-roberta-base-sentiment"
            
            # Initialize sentiment pipeline
            self.classifier = pipeline("sentiment-analysis", model=model_name)
            
            self.filtered_content = {
                "posts": [],
                "filtered_comments_by_post": {}
            }
            print("[FilteringRoBERTa] Model initialized successfully")
        except Exception as e:
            print(f"[FilteringRoBERTa] Error initializing model: {str(e)}")
            import traceback
            print(f"[FilteringRoBERTa] Traceback: {traceback.format_exc()}")
            raise

    def is_relevant(self, text):
        """Check if text has non-neutral sentiment"""
        try:
            result = self.classifier(text)[0]
            
            # Consider text relevant if sentiment is not neutral
            # and confidence score is above threshold
            is_relevant = (result['label'] != 'NEUTRAL' and result['score'] > 0.50)
            
            # Write sentiment analysis results to file
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR'), '3.1.score_for_each.txt'), 'a', encoding='utf-8') as f:
                f.write(f"Text: {text}\nSentiment: {result['label']}\nScore: {result['score']}\nIs relevant: {is_relevant}\n{'='*50}\n")
            
            return is_relevant
            
        except Exception as e:
            print(f"[FilteringRoBERTa] Error in relevance check: {str(e)}")
            return True  # Default to keeping content if check fails

    def filter_data(self, data, **kwargs):
        try:
            # Reset filtered content for new filtering
            self.filtered_content = {
                "posts": [],
                "filtered_comments_by_post": {}
            }
            
            print(f"[FilteringRoBERTa] Starting filter_data with {len(data.get('results', []))} results")
            filtered_data = data.copy()
            
            # Process each post
            for post_idx, post in enumerate(data["results"]):
                post_text = post["title"]
                if post.get("selftext"):
                    post_text += " " + post["selftext"]
                
                # Check post relevance - instead of removing, clear content if irrelevant
                if not self.is_relevant(post_text):
                    self.filtered_content["posts"].append(post)
                    # Clear post content but keep the structure
                    post["title"] = ""
                    if "selftext" in post:
                        post["selftext"] = ""
                
                # Process comments regardless of post relevance
                if "comments" in post:
                    relevant_comments = []
                    filtered_comments = []
                    
                    for comment in post["comments"]:
                        if self.is_relevant(comment["body"]):
                            relevant_comments.append(comment)
                        else:
                            filtered_comments.append(comment)
                    
                    # Store filtered comments
                    if filtered_comments:
                        self.filtered_content["filtered_comments_by_post"][post["title"]] = {
                            "post_info": {
                                "title": post["title"],
                                "created_utc": post.get("created_utc", ""),
                                "score": post.get("score", 0)
                            },
                            "filtered_comments": filtered_comments
                        }
                    
                    # Update post with relevant comments only
                    post["comments"] = relevant_comments
            
            # No need to remove posts anymore since we're keeping all of them
            filtered_data["results"] = data["results"]
            
            # Format and save filtered content
            formatted_filtered_content = {
                "posts": self.filtered_content["posts"],
                "comments_by_post": [
                    {
                        "post_info": post_data["post_info"],
                        "filtered_comments": post_data["filtered_comments"]
                    }
                    for post_data in self.filtered_content["filtered_comments_by_post"].values()
                ]
            }
            
            # Write filtered content to file
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR'), '3.2.filtered_content_roberta.json'), 'w', encoding='utf-8') as f:
                json.dump(formatted_filtered_content, f, indent=2)
            
            return filtered_data
            
        except Exception as e:
            print(f"[FilteringRoBERTa] Error in filter_data: {str(e)}")
            import traceback
            print(f"[FilteringRoBERTa] Traceback: {traceback.format_exc()}")
            return data
