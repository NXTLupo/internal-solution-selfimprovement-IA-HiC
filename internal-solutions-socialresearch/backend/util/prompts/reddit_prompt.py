from typing import Dict

# def get_system_prompt() -> SystemMessage:
#     return SystemMessage(
#         content="""You are an market research analyst specialized in analyzing social media discussions, 
#         Your task is to extract valuable market insights and user sentiment from Reddit conversations."""
#     )

def get_reddit_summary_prompt(posts_data: str) -> str:
    prompt = f"""
    You are a helpful assistant tasked with summarizing Reddit posts and their discussions.

    Context: The following contains Reddit posts and their comments from a subreddit search.

    Posts to analyze:
    {posts_data}

    Please provide:
    1. A concise summary of the main topics and themes discussed
    2. Key points from the most engaging discussions
    3. Notable trends or patterns in the community's responses
    4. Overall sentiment of the discussions

    Keep the summary clear, objective, and focused on the most significant information.
    """
    return prompt

def get_reddit_pros_cons_prompt(application_name: str, posts_data: str) -> str:
    prompt = f"""
    Analyze the following Reddit posts and comments to understand user emotions and attitudes towards {application_name}.
    Focus on how users feel about the product, their emotional responses, and their overall attitude. Output the result in JSON format.
    The application that needs to be analyzed is: {application_name}
    Posts and comments to analyze:
    {posts_data}

    Important Note: Do NOT count general appreciation or gratitude between users as positive sentiment towards {application_name}.
    Only include emotions and attitudes that are specifically directed at the application or its features.

    Please provide a detailed analysis in the following format:
    1. List the positive emotions and attitudes towards {application_name} (excitement, trust, satisfaction, etc.)
    2. List the negative emotions and attitudes towards {application_name} (frustration, disappointment, skepticism, etc.)
    3. For each emotion/attitude, include how many times it was expressed
    4. Note ALL posts that support these points (the number of evidence entries must match the frequency count)

    Ensure the response is based on the actual emotional content from the posts and comments.
    Format your response as a JSON object with two main arrays: 'positive' and 'negative'.
    Each item in these arrays should have:
    - 'point': the emotional response or attitude (e.g., "Excited about health tracking capabilities", "Frustrated with customer service")
    - 'frequency': how many times this emotion was expressed (must match the number of evidence entries)
    - 'evidence': an object containing post identifiers as keys and arrays of supporting quotes as values, don't skip the words by using ellipsis or any other characters

    Example format:
    {{
        "positive": [
            {{
                "point": "Trust in accuracy",
                "frequency": 2,
                "evidence": {{
                    "post6": [
                        "I completely trust this app with my health data",
                        "It's never let me down with its predictions"
                    ]
                }}
            }}
        ],
        "negative": []
    }}
    Before returning the result, make sure to check if the result is valid JSON.
    """
    
    return prompt

def openai_get_reddit_pros_cons_prompt(application_name: str, posts_data: str) -> str:
    prompt = f"""
    Extract user emotions and attitudes towards {application_name} from the following Reddit posts and comments.
    Focus on how users feel about the product, their emotional responses, and their overall attitude. Output the result in JSON format.
    The application that needs to be analyzed is: {application_name}
    Posts and comments to analyze:
    {posts_data}

    Important Note: Do NOT count general appreciation or gratitude between users as positive sentiment. Guidence or suggestions from users are not positive sentiment.
    Only include emotions and attitudes that are specifically directed at the {application_name} or its features.

    Please provide the following format:
    1. List the positive emotions and attitudes towards {application_name} (excitement, trust, satisfaction, etc.)
    2. List the negative emotions and attitudes towards {application_name} (frustration, disappointment, skepticism, etc.)
    3. For each emotion/attitude, include how many times it was expressed
    4. Note ALL posts that support these points (the number of evidence entries must match the frequency count)

    Ensure the response is based on the actual emotional content from the posts and comments.
    Format your response as a JSON object with two main arrays: 'positive' and 'negative'.
    Each item in these arrays should have:
    - 'point': the emotional response or attitude (e.g., "Excited about health tracking capabilities", "Frustrated with customer service")
    - 'frequency': how many times this emotion was expressed (must match the number of evidence entries)
    - 'evidence': an object containing post identifiers as keys and arrays of supporting quotes as values, don't skip the words by using ellipsis or any other characters

    Example format:
    {{
        "positive": [
            {{
                "point": "Trust in accuracy",
                "frequency": 2,
                "evidence": {{
                    "post6": [
                        "I completely trust this app with my health data",
                        "I love the accuracy"
                    ]
                }}
            }}
        ],
        "negative": []
    }}
    Before returning the result, make sure to check if the result is valid JSON.
    """
    
    return prompt

def get_summarizer_final_prompt(stacked_summaries: str) -> str:
    prompt = f"""
    You are an AI assistant specialized in organizing and categorizing Reddit discussion summaries.
    Your task is to analyze multiple summary chunks and organize them into unified categories while preserving all details.

    Multiple summary chunks to analyze and categorize:
    {stacked_summaries}

    Instructions:
    1. Parse through all the summary chunks provided above
    2. Group similar points into broader categories:
       - Create meaningful category names for related points
       - Keep all original points and evidence under each category
       - Maintain all frequencies and evidence intact
       - Do not remove or condense any information
    3. Maintain the same basic JSON structure but add categorization
    4. Ensure no information is lost in the process

    The output should follow this structure:
    {{
        "positive": [
            {{
                "category": "User Interface",
                "points": [
                    {{
                        "point": "original point 1",
                        "frequency": original_frequency,
                        "evidence": "original evidence"
                    }},
                    {{
                        "point": "original point 2",
                        "frequency": original_frequency,
                        "evidence": "original evidence"
                    }}
                ]
            }},
            {{
                "category": "Performance",
                "points": [
                    // Similar points grouped here
                ]
            }}
        ],
        "negative": [
            {{
                "category": "Technical Issues",
                "points": [
                    // Similar points grouped here
                ]
            }}
        ]
    }}
    """
    return prompt

def get_point_merger_prompt(points: list) -> str:
    # Extract just the point text from the complex structure
    simplified_points = {
        "positive": [],
        "negative": []
    }
    
    for data in points:
        if isinstance(data, dict):
            # Handle positive points
            if 'positive' in data:
                for item in data['positive']:
                    if isinstance(item, dict) and 'point' in item:
                        simplified_points['positive'].append(item['point'])
            
            # Handle negative points
            if 'negative' in data:
                for item in data['negative']:
                    if isinstance(item, dict) and 'point' in item:
                        simplified_points['negative'].append(item['point'])

    # Format the points into a readable string
    points_str = "positive:\n"
    for point in simplified_points['positive']:
        points_str += f"- {point}\n"
    
    points_str += "\nnegative:\n"
    for point in simplified_points['negative']:
        points_str += f"- {point}\n"
    
    prompt = f"""
    Create a mapping between similar points from this list, merging those that express the same core idea:

    {points_str}

    Rules:
    1. Merge points into big category
    2. Summarize or paraphrase the point if it's too long
    3. Do not edit the point if merge is not needed
    4. Do not merge points from positive and negative

    Return a JSON object with separate positive and negative mappings, like this:
    {{
        "positive": {{
            "Early detection of health issues (e.g., Graves' disease, pregnancy/miscarriage)": "Health monitoring and early detection",
            "Health monitoring and detection capabilities (pregnancy, illness, stress, lifestyle impact)": "Health monitoring and early detection",
            "Fertility and cycle tracking": "Health monitoring accuracy"
        }},
        "negative": {{
            "App keeps crashing": "App stability issues",
            "Frequent app crashes during sync": "App stability issues",
            "Inaccurate health data": "Data accuracy concerns"
        }}
    }}

    Ensure the response is valid JSON.
    """
    return prompt

def get_category_merger_prompt(merged_result: Dict) -> str:
    # Extract points from the merged result
    simplified_points = {
        "positive": [],
        "negative": []
    }
    
    # Handle the dictionary structure properly
    for category in ['positive', 'negative']:
        for item in merged_result.get(category, []):
            if isinstance(item, dict) and 'point' in item:
                simplified_points[category].append(item['point'])

    # Format the points into a readable string
    points_str = "positive:\n"
    for point in simplified_points['positive']:
        points_str += f"- {point}\n"
    
    points_str += "\nnegative:\n"
    for point in simplified_points['negative']:
        points_str += f"- {point}\n"

    prompt = f"""
    You are an AI assistant specialized in organizing points into broader categories.
    
    Here are the mapped points:
    {points_str}
    
    Instructions:
    1. Group these points into meaningful high-level categories
    2. Keep the positive and negative distinction
    3. Each point should belong to exactly one category
    4. Categories should be broad but descriptive (e.g., "Health Monitoring", "User Experience", "Technical Performance")
    
    Return the categorization in this JSON format:
    {{
        "positive": [
            {{
                "category": "Health Monitoring",
                "points": [
                    "Health tracking accuracy",
                    "Early detection capabilities",
                    "Sleep monitoring features"
                ]
            }},
            {{
                "category": "User Experience",
                "points": [
                    "Easy interface",
                    "Good design"
                ]
            }}
        ],
        "negative": [
            {{
                "category": "Technical Issues",
                "points": [
                    "Battery problems",
                    "Sync issues"
                ]
            }},
            {{
                "category": "Customer Service",
                "points": [
                    "Response times",
                    "Support quality"
                ]
            }}
        ]
    }}
    """
    return prompt

def get_ai_summary_prompt(analysis_data: Dict, application_name: str) -> str:
    # Format the data for the LLM
    positive_categories = analysis_data.get('positive', [])
    negative_categories = analysis_data.get('negative', [])
    
    # Calculate total frequencies
    positive_total = sum([
        sum([point.get('frequency', 0) for point in category.get('points', [])])
        for category in positive_categories
    ])
    
    negative_total = sum([
        sum([point.get('frequency', 0) for point in category.get('points', [])])
        for category in negative_categories
    ])
    
    total_mentions = positive_total + negative_total
    positive_percentage = round((positive_total / total_mentions) * 100) if total_mentions > 0 else 0
    
    # Find top categories
    # Sort categories by total frequency
    def get_category_total(category):
        return sum([point.get('frequency', 0) for point in category.get('points', [])])
    
    sorted_positive = sorted(positive_categories, key=get_category_total, reverse=True)
    sorted_negative = sorted(negative_categories, key=get_category_total, reverse=True)
    
    top_positive = sorted_positive[0] if sorted_positive else None
    top_negative = sorted_negative[0] if sorted_negative else None
    
    prompt = f"""
    You are an AI assistant that analyzes sentiment data and provides concise, insightful summaries.
    The application that needs to be analyzed is: {application_name}
    Here is the sentiment analysis data:
    - Total mentions: {total_mentions}
    - Positive mentions: {positive_total} ({positive_percentage}%)
    - Negative mentions: {negative_total} ({100 - positive_percentage}%)
    
    Top positive category: {top_positive.get('category') if top_positive else 'None'}
    Top positive points: {', '.join([f"{p.get('point')} ({p.get('frequency')})" for p in (top_positive.get('points', [])[:3] if top_positive else [])])}
    
    Top negative category: {top_negative.get('category') if top_negative else 'None'}
    Top negative points: {', '.join([f"{p.get('point')} ({p.get('frequency')})" for p in (top_negative.get('points', [])[:3] if top_negative else [])])}
    
    Based on this data, please provide:
    1. A brief overall summary of the sentiment, if there are less than 300 mentions, explain the data might be biased, but still provide the summary
    2. An insight about the top positive category
    3. An insight about the top negative category
    4. A list of 1-5 actionable recommendations based on the data
    
    Return your response as a JSON object with the following structure:
    {{
        "summary": "overall summary towards {application_name}, interesting insights about the data",
        "topPositive": "insight about the top positive category",
        "topNegative": "insight about the top negative category",
        "recommendations": [
            "first recommendation",
            "second recommendation",
            "third recommendation"
        ]
    }}
    """
    
    return prompt
