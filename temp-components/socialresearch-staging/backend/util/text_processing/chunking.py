def chunk_filtered_data(filtered_data, chunk_size=40000):  #standard chunk size: 50000
    # First, pre-format all posts with their global index
    formatted_posts_with_size = []
    current_post_num = 1
    
    for post in filtered_data.values():
        # Skip the post number since it's already in the key
        formatted_post = post  # The post is already formatted as a string
        
        formatted_posts_with_size.append({
            'post_num': current_post_num,
            'formatted': formatted_post,
            'size': len(formatted_post)
        })
        current_post_num += 1

    # Now chunk based on size while keeping posts intact
    chunked_results = []
    current_chunk = {}
    current_size = 0
    
    for post_data in formatted_posts_with_size:
        # If adding this post would exceed chunk size and we already have posts, create new chunk
        if current_size + post_data['size'] > chunk_size and current_chunk:
            chunked_results.append(current_chunk)
            current_chunk = {}
            current_size = 0
        
        post_key = f"post {post_data['post_num']}"
        current_chunk[post_key] = post_data['formatted']
        current_size += post_data['size']
    
    # Add final chunk if there's anything left
    if current_chunk:
        chunked_results.append(current_chunk)
    
    return chunked_results 