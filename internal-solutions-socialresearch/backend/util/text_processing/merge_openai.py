from typing import Dict, List
import json
from util.llm_models.openai import get_single_azure_openai_completion
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


def merge_similar_points(chunk_results: List[Dict]) -> Dict:
    """Merge similar points across multiple chunk results using Azure OpenAI."""
    print("\n[merge_openai] Starting merge process...")
    
    # Extract all points
    points = extract_points(chunk_results)
    print(f"[merge_openai] Extracted {len(points)} points to analyze")
    
    # Get mapping of similar points using Azure OpenAI
    points_str = json.dumps(points, indent=2)
    merge_prompt = get_point_merger_prompt(points_str)
    print("[merge_openai] Generated merge prompt:")
    print(merge_prompt)
    print("\n[merge_openai] Sending to Azure OpenAI...")
    
    # Get response from Azure OpenAI
    response = get_single_azure_openai_completion(
        messages=[{"role": "user", "content": merge_prompt}],
        model="gpt-4",
        temperature=0.3,
        return_json=True
    )
    
    if not response:
        raise Exception("Failed to get response from Azure OpenAI")
    
    print("\n[merge_openai] Processing response...")
    # point_mapping will be like: {"The app is fast": "Quick performance"} or vice versa
    try:
        point_mapping = json.loads(response)
    except json.JSONDecodeError as e:
        print(f"[merge_openai] Error parsing JSON response: {str(e)}")
        print(f"[merge_openai] Raw response: {response}")
        raise
    
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
    
    print(f"[merge_openai] Merge complete! Found {len(merged_results['positive'])} positive and {len(merged_results['negative'])} negative")
    return merged_results


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
    
    print("\n[merge_openai] Starting test merge...")
    merged = merge_similar_points(test_chunks)
    print("\n[merge_openai] Test Results:")
    print(json.dumps(merged, indent=2))


if __name__ == "__main__":
    test_merge()
