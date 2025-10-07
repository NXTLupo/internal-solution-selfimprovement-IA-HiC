import json
import os

def count_posts(data):
    # Load the JSON data if it's a string
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return "Error: Invalid JSON data"
    
    # Check if the data has the expected structure
    if not isinstance(data, dict) or "search_id" not in data:
        return "Error: Unexpected data format"
    
    # Count the posts in the results array
    results = data.get("results", [])
    return len(results)

# Get the current directory of this script
current_dir = os.path.dirname(os.path.abspath(__file__))
# Construct the path to the data file
file_path = os.path.join(current_dir, 'log_sentiment', '1.search_data.json')

try:
    # Try to open and read the file
    with open(file_path, 'r') as file:
        json_data = json.load(file)
        
    post_count = count_posts(json_data)
    print(f"Total number of posts: {post_count}")
except FileNotFoundError:
    print(f"Error: File not found at {file_path}")
    # Try alternative path
    alt_path = os.path.join(os.environ.get('SENTIMENT_LOG_DIR', '/app/temp'), '1.search_data.json')
    print(f"Trying alternative path: {alt_path}")
    try:
        with open(alt_path, 'r') as file:
            json_data = json.load(file)
        post_count = count_posts(json_data)
        print(f"Total number of posts: {post_count}")
    except FileNotFoundError:
        print(f"Error: File not found at alternative path {alt_path}")