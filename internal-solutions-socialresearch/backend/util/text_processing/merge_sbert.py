import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any
import os

class PointMerger:
    def __init__(self, similarity_threshold=0.6):
        # Initialize the sentence transformer model
        self.model = SentenceTransformer("all-mpnet-base-v2")
        self.similarity_threshold = similarity_threshold

    def get_embeddings(self, points: List[Dict[str, Any]]) -> np.ndarray:
        # Preprocess texts to improve matching
        texts = [point["point"].lower().strip() for point in points]  # Convert to lowercase
        return self.model.encode(texts)

    def find_similar_points(self, points: List[Dict[str, Any]]) -> List[List[int]]:
        # Calculate cosine similarity matrix
        if not points:
            return []
            
        embeddings = self.get_embeddings(points)
        similarity_matrix = cosine_similarity(embeddings)
        
        merged_groups = []
        used_indices = set()

        for i in range(len(similarity_matrix)):
            if i in used_indices:
                continue

            # Find all points similar to current point
            similar_indices = [i]
            for j in range(i + 1, len(similarity_matrix)):
                if j not in used_indices and similarity_matrix[i][j] >= self.similarity_threshold:
                    similar_indices.append(j)

            if similar_indices:
                merged_groups.append(similar_indices)
                used_indices.update(similar_indices)

        return merged_groups

    def merge_points(self, similar_points: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Sort by frequency and length of point text to choose the most descriptive one
        sorted_points = sorted(
            similar_points,
            key=lambda x: (x["frequency"], len(x["point"])),
            reverse=True
        )
        main_point = sorted_points[0]
        
        merged_point = {
            "point": main_point["point"],
            "frequency": sum(p["frequency"] for p in similar_points),
            "evidence": {}  # Changed to dict instead of list
        }

        # Combine evidence while removing duplicates
        seen_evidence = set()
        evidence_counter = 1
        for point in similar_points:
            evidence_items = point["evidence"]
            # Handle both dict and list evidence formats
            if isinstance(evidence_items, dict):
                for post_id, evidence in evidence_items.items():
                    if evidence.lower() not in seen_evidence:
                        merged_point["evidence"][post_id] = evidence
                        seen_evidence.add(evidence.lower())
            else:  # List format
                for evidence in evidence_items:
                    if evidence.lower() not in seen_evidence:
                        post_id = f"post{evidence_counter}"
                        merged_point["evidence"][post_id] = evidence
                        seen_evidence.add(evidence.lower())
                        evidence_counter += 1

        return merged_point

    def merge_category(self, points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not points:
            return points

        # Get embeddings for all points
        similar_groups = self.find_similar_points(points)
        
        # Merge points and create new list
        merged_points = []
        processed_indices = set()

        # Merge similar points
        for group in similar_groups:
            if len(group) > 1:  # Multiple similar points found
                points_to_merge = [points[i] for i in group]
                merged_points.append(self.merge_points(points_to_merge))
                processed_indices.update(group)
            
        # Add remaining unique points
        for i in range(len(points)):
            if i not in processed_indices:
                merged_points.append(points[i])

        return merged_points

    def merge_json_data(self, json_data_list: List[str]) -> Dict[str, Any]:
        """Merge multiple JSON strings directly without reading from files."""
        all_data = {
            "positive": [],
            "negative": []
        }
        print("!!!!!!!!!!!\n",json_data_list,"\n!!!!!!!!!!!")
        # Collect all points from multiple JSON strings
        for json_str in json_data_list:
            try:
                # Handle both string and dict inputs
                if isinstance(json_str, str):
                    # Clean up the string by removing escaped newlines and normalizing quotes
                    cleaned_str = json_str.replace('\\n', '').replace('\\"', '"')
                    try:
                        # Try to parse as JSON first
                        data = json.loads(cleaned_str)
                    except json.JSONDecodeError:
                        try:
                            # If that fails, try to parse with eval (safely)
                            import ast
                            data = ast.literal_eval(cleaned_str)
                        except:
                            # If both fail, treat as a single point
                            data = {"positive": [{"point": json_str, "frequency": 1, "evidence": []}], "negative": []}
                else:
                    data = json_str
                
                # Ensure evidence is in the correct format
                for category in ['positive', 'negative']:
                    for point in data.get(category, []):
                        # Convert evidence dict to list if necessary
                        if isinstance(point.get('evidence'), dict):
                            point['evidence'] = list(point['evidence'].values())
                
                all_data["positive"].extend(data.get("positive", []))
                all_data["negative"].extend(data.get("negative", []))
            except Exception as e:
                print(f"Error processing data: {str(e)}")
                continue

        # Merge similar points in positive and negative separately
        merged_data = {
            "positive": self.merge_category(all_data["positive"]),
            "negative": self.merge_category(all_data["negative"])
        }

        return merged_data

def merge_points_from_data(json_data_list: List[str], output_file: str = None, similarity_threshold: float = 0.6):
    """Merge points from a list of JSON strings."""
    try:
        merger = PointMerger(similarity_threshold)
        merged_data = merger.merge_json_data(json_data_list)

        if output_file:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(merged_data, f, indent=2, ensure_ascii=False)
            print(f"Successfully merged points and saved to {output_file}")

        return merged_data

    except Exception as e:
        print(f"Error during point merging: {str(e)}")
        raise

if __name__ == "__main__":
    # Example usage
    input1 = '''
    {
  "positive": [
    {
      "point": "Effective health monitoring (e.g., detecting illnesses, hormonal changes)",
      "frequency": 5,
      "evidence": {
        "post4": "my oura ring diagnosed me with low progesterone...showing real and accurate data",
        "post7": "oura played a role in getting you the help you needed...symptom radar is a very useful feature",
        "post13": "my oura ring caught my graves disease...resting heart rate was rising",
        "post8_comment1": "symptom radar came out right as i was hit with a really bad sinus infection",
        "post8_comment2": "oura has not saved my life but it did detect when i was sick"
      }
    },
    {
      "point": "Active community support and customer care responsiveness",
      "frequency": 4,
      "evidence": {
        "post3": "applaud the team for doing a great job...active in this sub",
        "post3_comment1": "seeing how active they are in this sub...speaks volume",
        "post7_comment1": "oura social care team...wishing you strength",
        "post12_comment2": "oura is active on this sub...sent a dm with next steps"
      }
    },
    {
      "point": "Useful cycle tracking integration for women\u2019s health",
      "frequency": 3,
      "evidence": {
        "post1": "wish oura ring acknowledged luteal phases...cycle tab explains changes",
        "post4": "comparing my cycle phases to sleep duration...data proves hormonal impact",
        "post4_comment1": "oura was a tool to advocate for yourself"
      }
    },
    {
      "point": "Durable design (reported by some users)",
      "frequency": 2,
      "evidence": {
        "post2_comment1": "titanium on the inside...no sensor bumps",
        "post14_comment2": "no scratches...black model not matte"
      }
    },
    {
      "point": "Battery life improvements in Gen 4",
      "frequency": 2,
      "evidence": {
        "post2_comment3": "one day battery more",
        "post14_comment1": "battery went to crap...sent me a new one"
      }
    }
  ],
  "negative": [
    {
      "point": "Color durability issues (scratches/fading in premium finishes)",
      "frequency": 6,
      "evidence": {
        "post5": "rose gold ring looks so bad after 8 months...ugliest bronze colors",
        "post5_comment1": "gold versions fail to match...look cheap and costumey",
        "post5_comment2": "rose gold looks bad right out of the box",
        "post6_comment1": "scratched from lifting...ruined if i didnt take it off",
        "post3_comment4": "gold rubbing off almost instantly...paid a premium",
        "post5_comment3": "silver ring still looks clean...basic color recommended"
      }
    },
    {
      "point": "Customer service challenges (delays, refund issues)",
      "frequency": 5,
      "evidence": {
        "post12": "couldnt speak to anyone but robot assistant...complicated refund process",
        "post12_comment4": "customer service is trash...took 4 days to respond",
        "post3_comment3": "free replacements...shouldnt be falling apart",
        "post8_comment6": "oura didnt save my life posts...marketing campaigns",
        "post14_comment1": "battery defective...annoying short straw"
      }
    },
    {
      "point": "Gen 4 build quality concerns (e.g., separation issues)",
      "frequency": 4,
      "evidence": {
        "post3": "outer cover separation...fewer than 1 in 1000 units",
        "post14_title": "any gen 4 owners have a ring that hasnt fallen apart",
        "post3_comment4": "400 ring with monthly subscription shouldnt be falling apart",
        "post14_comment5": "thinking about...falling apart makes me nervous"
      }
    },
    {
      "point": "Inconsistent symptom radar accuracy",
      "frequency": 3,
      "evidence": {
        "post8": "oura had no idea i was severely ill...no unusual signs",
        "post8_comment4": "temperature fluctuation...day behind at best",
        "post8_comment5": "not sold on this feature...stress data mismatched"
      }
    },
    {
      "point": "High cost and subscription model complaints",
      "frequency": 3,
      "evidence": {
        "post2_comment7": "532 USD...wild pricing",
        "post11_comment3": "nonsensical monthly subscription",
        "post5_title": "PSA stop buying expensive color versions"
      }
    },
    {
      "point": "Lack of cycle phase integration in readiness metrics",
      "frequency": 2,
      "evidence": {
        "post1": "readiness scores tanking during luteal phase...no tailored messages",
        "post1_comment1": "software written by people who dont menstruate"
      }
    }
  ]
}
'''

    input2 = '''
    {
  "positive": [
    {
      "point": "Accurate health monitoring (e.g., pregnancy detection, cycle tracking)",
      "frequency": 3,
      "evidence": {
        "post17": "my oura ring picked it up immediately with higher than normal temps heart rate and respiratory rate...the ring seemed to be more accurate than my own obgyn",
        "post29": "my temperature was still above baseline...it was positive at 10 dpo",
        "post25": "the oura ring has proved me otherwise...i realized i walk substantially more steps on average days than i realized"
      }
    },
    {
      "point": "Automatic activity recognition (e.g., ice skating, pickleball)",
      "frequency": 2,
      "evidence": {
        "post28": "the ring automatically recorded the activity how did it know i was ice skating",
        "post28_comment": "mine knew i was playing pickleball which really tripped me out"
      }
    },
    {
      "point": "Comfort and sleep tracking accuracy",
      "frequency": 3,
      "evidence": {
        "post23": "its lightweight hasslefree and easy to wear...excellent for sleep and health tracking",
        "post27": "much more comfy wearing it to bed as opposed to my watch",
        "post25": "sleep score and readiness score...helped me make changes in my life"
      }
    },
    {
      "point": "Durable design (scratch acceptance as part of daily use)",
      "frequency": 2,
      "evidence": {
        "post18": "i like the scratches gives it character",
        "post18_comment": "every scratch is a story embrace them"
      }
    },
    {
      "point": "Insightful data for lifestyle improvements",
      "frequency": 2,
      "evidence": {
        "post25": "sleep data keeps me accountable...changed my perspective on my energy level",
        "post27": "improved my eating habits which in turn helps with improved quality of sleep"
      }
    }
  ],
  "negative": [
    {
      "point": "Subscription model disliked (paywalled basic data)",
      "frequency": 5,
      "evidence": {
        "post15": "having to pay monthly so i can see information my ring is already tracking is ridiculous",
        "post23": "the required subscription can be frustrating...down right pigs",
        "post16_comment": "subscription model just makes oura a scalable software company...dick move",
        "post20_comment": "never trust the data...charging a sub fee now pretty disgusting",
        "post26_comment": "freegrandfathered in subscription...wishful thinking"
      }
    },
    {
      "point": "Hardware reliability issues (e.g., gen4 separation, charging failures)",
      "frequency": 4,
      "evidence": {
        "post22": "bricked oura ring 4...ring not charging or connecting",
        "post20": "ring 4 cover separation...fewer than 1 in 1000 members",
        "post21": "empty box...stolen ring",
        "post22_comment": "my gen 2 cant get a full daynight worth of battery"
      }
    },
    {
      "point": "Scratching/finish deterioration complaints",
      "frequency": 3,
      "evidence": {
        "post18": "the finish coming off does...looks awful after a few months",
        "post30": "rose gold finish...will develop a darker patina",
        "post18_comment": "brushed silver hides scratches much better"
      }
    },
    {
      "point": "Inaccurate activity tracking (e.g., missed workouts)",
      "frequency": 2,
      "evidence": {
        "post23_comment": "my ring never picks up my workouts...consistent flaw",
        "post27": "activity tracker though is atrocious...wreak havoc on step count"
      }
    },
    {
      "point": "Battery life degradation over time",
      "frequency": 2,
      "evidence": {
        "post23_comment": "charging it every single day is getting ridiculously tedious",
        "post27_comment": "gen 2 cant get a full daynight worth of battery"
      }
    },
    {
      "point": "Privacy concerns over health data handling",
      "frequency": 1,
      "evidence": {
        "post20": "increased concerns surrounding reproductive rights...protecting your data"
      }
    },
    {
      "point": "Bulky design (gen3 complaints)",
      "frequency": 1,
      "evidence": {
        "post16_comment": "gen 3 is so bulky and thick...only wear my 3 at night"
      }
    }
  ]
}
'''

    json_data_list = [input1, input2]
    merge_points_from_data(json_data_list, 'temp/merged_output.json')
