import json
import numpy as np
import pandas as pd
import hdbscan
from sentence_transformers import SentenceTransformer
import os

class Filtering:
    def __init__(self):
        try:
            # https://sbert.net/docs/sentence_transformer/pretrained_models.html
            print("[Filtering] Initializing sentence transformer...")
            self.model = SentenceTransformer("all-mpnet-base-v2")
            print("[Filtering] Model loaded with parameters:", self.model.get_sentence_embedding_dimension())
            self.filtered_content = {
                "posts": [],
                "filtered_comments_by_post": {}
            }
            print("[Filtering] Model initialized successfully")
        except Exception as e:
            print(f"[Filtering] Error initializing model: {str(e)}")
            import traceback
            print(f"[Filtering] Traceback: {traceback.format_exc()}")
            raise  # Re-raise the exception to ensure the error is properly handled
        
    def filter_data(self, data):
        try:
            # Reset filtered content for new filtering
            self.filtered_content = {
                "posts": [],
                "filtered_comments_by_post": {}
            }
            
            print(f"[Filtering] Starting filter_data with {len(data.get('results', []))} results")
            filtered_data = data.copy()
            
            # Extract texts for analysis
            texts = []
            source_map = {}
            text_mapping = []
            
            print("[Filtering] Processing posts and comments...")
            for post_idx, post in enumerate(data["results"]):
                post_text = post["title"]
                if post.get("selftext"):
                    post_text += " " + post["selftext"]
                
                texts.append(post_text)
                source_map[post_text] = {"type": "post", "source": post["title"]}
                text_mapping.append({"type": "post", "idx": post_idx})
                
                if "comments" in post:
                    for comment_idx, comment in enumerate(post["comments"]):
                        texts.append(comment["body"])
                        source_map[comment["body"]] = {"type": "comment", "source": post["title"]}
                        text_mapping.append({
                            "type": "comment",
                            "post_idx": post_idx,
                            "comment_idx": comment_idx
                        })
            
            if not texts:
                print("[Filtering] No texts to analyze, returning original data")
                return filtered_data
                
            print(f"[Filtering] Generating embeddings for {len(texts)} texts")
            embeddings = self.model.encode(texts, show_progress_bar=True)
            print(f"[Filtering] Generated embeddings shape: {embeddings.shape}")
            
            # print("[Filtering] Performing dimensionality reduction...")
            # umap_reducer = umap.UMAP(n_components=5, random_state=42)
            # reduced_embeddings = umap_reducer.fit_transform(embeddings)
            # print(f"[Filtering] Reduced embeddings shape: {reduced_embeddings.shape}")
            
            print("[Filtering] Performing clustering on raw embeddings...")
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=2,
                min_samples=1,
                metric='euclidean',
                cluster_selection_method='eom',
                prediction_data=True,
                core_dist_n_jobs=1
            )
            print(f"[Filtering] Clustering with parameters: {clusterer.get_params()}")
            print(f"[Filtering] Embeddings dtype: {embeddings.dtype}")  # Check dtype

            try:
                # Use raw embeddings instead of reduced embeddings
                cluster_labels = clusterer.fit_predict(embeddings.astype(np.float32))
                print(f"[Filtering] Unique cluster labels: {np.unique(cluster_labels)}")
            except Exception as e:
                print(f"[Filtering] Clustering failed: {str(e)}")
                return filtered_data
            
            # Create mask for relevant content (non-noise points)
            relevant_mask = cluster_labels != -1
            
            # Filter out irrelevant content
            posts_to_remove = set()
            comments_to_remove = {}
            
            for idx, (is_relevant, mapping) in enumerate(zip(relevant_mask, text_mapping)):
                if not is_relevant:
                    if mapping["type"] == "post":
                        posts_to_remove.add(mapping["idx"])
                        self.filtered_content["posts"].append(data["results"][mapping["idx"]])
                    else:
                        post_idx = mapping["post_idx"]
                        post_title = data["results"][post_idx]["title"]
                        
                        # Initialize list for this post if it doesn't exist
                        if post_title not in self.filtered_content["filtered_comments_by_post"]:
                            self.filtered_content["filtered_comments_by_post"][post_title] = {
                                "post_info": {
                                    "title": post_title,
                                    "created_utc": data["results"][post_idx].get("created_utc", ""),
                                    "score": data["results"][post_idx].get("score", 0)
                                },
                                "filtered_comments": []
                            }
                        
                        # Add comment to the list for this post
                        self.filtered_content["filtered_comments_by_post"][post_title]["filtered_comments"].append(
                            data["results"][post_idx]["comments"][mapping["comment_idx"]]
                        )
                        
                        if post_idx not in comments_to_remove:
                            comments_to_remove[post_idx] = set()
                        comments_to_remove[post_idx].add(mapping["comment_idx"])
            
            # Remove irrelevant content from the copy
            filtered_data["results"] = [
                post for idx, post in enumerate(filtered_data["results"])
                if idx not in posts_to_remove
            ]
            
            # Remove irrelevant comments
            for post_idx, post in enumerate(filtered_data["results"]):
                if "comments" in post and post_idx in comments_to_remove:
                    post["comments"] = [
                        comment for idx, comment in enumerate(post["comments"])
                        if idx not in comments_to_remove[post_idx]
                    ]
            
            # Convert the filtered_comments_by_post dictionary to a list for better JSON formatting
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
            
            # Write the formatted filtered content to file
            with open(os.path.join(os.getenv('SENTIMENT_LOG_DIR'), '2.5.filtered_content.json'), 'w', encoding='utf-8') as f:
                json.dump(formatted_filtered_content, f, indent=2)
                
            return filtered_data
            
        except Exception as e:
            print(f"[Filtering] Error in filter_data: {str(e)}")
            import traceback
            print(f"[Filtering] Traceback: {traceback.format_exc()}")
            return data