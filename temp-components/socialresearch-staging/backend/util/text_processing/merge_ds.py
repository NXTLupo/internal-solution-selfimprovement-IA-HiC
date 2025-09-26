from typing import Dict, List
from collections import defaultdict
import json
from util.llm_models.deepseek import get_single_deepseek_completion, get_json_deepseek_completion
from util.prompts.reddit_prompt import get_point_merger_prompt


def extract_points(chunk_results: List[Dict]) -> List[str]:
    """Extract all points from the chunk results."""
    points = []
    for chunk in chunk_results:
        for category in ['positive', 'negative']:
            if category in chunk:
                for item in chunk[category]:
                    points.append(item['point'])
    return points


def merge_similar_points(chunk_results: List[Dict], merge_prompt: str = None) -> Dict:
    """Merge similar points across multiple chunk results."""
    print("\n[merge_llm] Starting merge process...")
    
    # Extract all points
    points = extract_points(chunk_results)
    print(f"[merge_llm] Extracted {len(points)} points to analyze")
        
    print("[merge_llm] Generated merge prompt:")
    print(merge_prompt)
    print("\n[merge_llm] Sending to DeepSeek...")
    
    # Stream the response
    print("\n[merge_llm] DeepSeek Response:")
    response = ""
    for content in get_json_deepseek_completion(
        messages=[{"role": "user", "content": merge_prompt}],
        stream=True
    ):
        if content:
            print(content, end="", flush=True)
            response += content
    
    if not response:
        raise Exception("Failed to get response from DeepSeek")
    
    print("\n[merge_llm] Processing response...")
    
    # Clean up the response to extract just the JSON part
    try:
        # Find the last occurrence of a JSON-like structure
        last_open_brace = response.rfind("{")
        last_close_brace = response.rfind("}")
        
        if last_open_brace >= 0 and last_close_brace >= 0:
            json_str = response[last_open_brace:last_close_brace + 1]
            point_mapping = json.loads(json_str)
        else:
            raise json.JSONDecodeError("No JSON structure found", response, 0)
            
    except json.JSONDecodeError as e:
        print(f"[merge_llm] Error parsing response as JSON: {str(e)}")
        print(f"[merge_llm] Raw response: {response}")
        # If parsing fails, return the original chunks unmapped
        return {
            "positive": [item for chunk in chunk_results for item in chunk.get("positive", [])],
            "negative": [item for chunk in chunk_results for item in chunk.get("negative", [])]
        }
    
    # Create merged results
    merged_results = {
        "positive": [],
        "negative": []
    }
    
    # Create a reverse mapping for easier lookup
    reverse_mapping = {}
    for original, standardized in point_mapping.items():
        reverse_mapping[standardized] = original
    
    # Track processed points to avoid duplicates
    processed_points = set()
    
    # Process each chunk
    for chunk in chunk_results:
        for category in ['positive', 'negative']:
            for item in chunk.get(category, []):
                original_point = item['point']
                
                # Skip if we've already processed this point or its mapped version
                if original_point in processed_points:
                    continue
                
                # Check if this point has a mapping or is mapped to by another point
                mapped_point = point_mapping.get(original_point)
                reverse_mapped_point = reverse_mapping.get(original_point)
                
                if mapped_point or reverse_mapped_point:
                    # This point has a match, find all related items
                    standardized_point = mapped_point if mapped_point else original_point
                    related_items = []
                    
                    # Collect all items with matching points
                    for search_chunk in chunk_results:
                        for search_category in ['positive', 'negative']:
                            for search_item in search_chunk.get(search_category, []):
                                search_point = search_item['point']
                                if (search_point == original_point or 
                                    search_point == mapped_point or 
                                    search_point == reverse_mapped_point):
                                    related_items.append(search_item)
                                    processed_points.add(search_point)
                    
                    # Merge the related items
                    total_frequency = sum(item['frequency'] for item in related_items)
                    combined_evidence = {}
                    for item in related_items:
                        combined_evidence.update(item['evidence'])
                    
                    merged_item = {
                        "point": standardized_point,
                        "frequency": total_frequency,
                        "evidence": combined_evidence
                    }
                    
                    merged_results[category].append(merged_item)
                else:
                    # No match found, add as is
                    processed_points.add(original_point)
                    merged_results[category].append(item)
    
    print(f"[merge_llm] Merge complete! Found {len(merged_results['positive'])} positive and {len(merged_results['negative'])} negative")
    
    # After the initial merge, add a second pass to combine identical points
    final_results = {
        "positive": [],
        "negative": []
    }
    
    for category in ['positive', 'negative']:
        # Group by point title
        point_groups = defaultdict(list)
        for item in merged_results[category]:
            point_groups[item['point']].append(item)
        
        # Merge items with identical points
        for point_title, items in point_groups.items():
            if len(items) > 1:
                # Combine frequencies and evidence
                merged_item = {
                    "point": point_title,
                    "frequency": sum(item['frequency'] for item in items),
                    "evidence": {}
                }
                # Merge all evidence dictionaries
                for item in items:
                    merged_item['evidence'].update(item['evidence'])
                final_results[category].append(merged_item)
            else:
                # Single item, no need to merge
                final_results[category].append(items[0])
    print("final results *********\n", final_results, "\n*********")
    print(f"[merge_llm] Final merge complete! Found {len(final_results['positive'])} positive and {len(final_results['negative'])} negative")
    return final_results


def test_merge():
    # Test data
    test_chunks = [
        {
            "positive": [
                {
                    "point": "The app is fast",
                    "frequency": 2,
                    "evidence": {"post1": "quote1", "post2": "quote2"}
                },
                {
                    "point": "Accurate health monitoring (e.g., pregnancy detection, cycle tracking)",
                    "frequency": 3,
                    "evidence": {
                        "post17": "my oura ring picked it up immediately with higher than normal temps heart rate and respiratory rate...the ring seemed to be more accurate than my own obgyn",
                        "post29": "my temperature was still above baseline...it was positive at 10 dpo",
                        "post25": "the oura ring has proved me otherwise...i realized i walk substantially more steps on average days than i realized"
                    }
                },
            ],
            "negative": []
        },
        {
            "positive": [
                {
                    "point": "Quick performance",
                    "frequency": 1,
                    "evidence": {"post3": "quote3"}
                },
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
            ],
            "negative": []
        }
    ]
    
    print("\n[merge_llm] Starting test merge...")
    merged = merge_similar_points(test_chunks)
    print("\n[merge_llm] Test Results:")
    print(json.dumps(merged, indent=2))


if __name__ == "__main__":
    test_merge() 