import json
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import os
class FilteringABSA:
    def __init__(self):
        try:
            print("[FilteringABSA] Initializing ABSA model...")
            model_name = "yangheng/deberta-v3-base-absa-v1.1"
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
            
            # Create pipeline
            self.classifier = pipeline(
                "text-classification", 
                model=self.model, 
                tokenizer=self.tokenizer
            )
            
            self.filtered_content = {
                "posts": [],
                "filtered_comments_by_post": {}
            }
            print("[FilteringABSA] Model initialized successfully")
        except Exception as e:
            print(f"[FilteringABSA] Error initializing model: {str(e)}")
            import traceback
            print(f"[FilteringABSA] Traceback: {traceback.format_exc()}")
            raise

    def is_relevant(self, text, keyword):
        """Check if text is relevant to keyword using ABSA"""
        try:
            # Format input for ABSA model
            input_text = f"{text} [SEP] {keyword}"
            result = self.classifier(input_text)[0]
            
            # ABSA model returns: 'NEG', 'NEU', or 'POS'
            # Consider relevant if sentiment is not neutral
            return result['label'] != 'NEU' and result['score'] > 0.6
            
        except Exception as e:
            print(f"[FilteringABSA] Error in relevance check: {str(e)}")
            return True  # Default to keeping content if check fails

    def filter_data(self, data, keyword):
        try:
            # Reset filtered content for new filtering
            self.filtered_content = {
                "posts": [],
                "filtered_comments_by_post": {}
            }
            
            print(f"[FilteringABSA] Starting filter_data with {len(data.get('results', []))} results")
            filtered_data = data.copy()
            posts_to_remove = set()
            
            # Process each post
            for post_idx, post in enumerate(data["results"]):
                post_text = post["title"]
                if post.get("selftext"):
                    post_text += " " + post["selftext"]
                
                # Check post relevance
                if not self.is_relevant(post_text, keyword):
                    posts_to_remove.add(post_idx)
                    self.filtered_content["posts"].append(post)
                    continue
                
                # Process comments if post is relevant
                if "comments" in post:
                    relevant_comments = []
                    filtered_comments = []
                    
                    for comment in post["comments"]:
                        if self.is_relevant(comment["body"], keyword):
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
            
            # Remove irrelevant posts
            filtered_data["results"] = [
                post for idx, post in enumerate(filtered_data["results"])
                if idx not in posts_to_remove
            ]
            
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
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR'), '2.5.filtered_content_absa.json'), 'w', encoding='utf-8') as f:
                json.dump(formatted_filtered_content, f, indent=2)
            
            return filtered_data
            
        except Exception as e:
            print(f"[FilteringABSA] Error in filter_data: {str(e)}")
            import traceback
            print(f"[FilteringABSA] Traceback: {traceback.format_exc()}")
            return data
