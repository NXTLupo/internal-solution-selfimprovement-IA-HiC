def get_openai_rag_prompt(user_query: str, rag_results: list, topic_data: dict = None) -> str:
    # Start with the base prompt
    prompt = f"""You are a helpful AI assistant that answers questions based on the provided context.

"""
    
    # Add topic model data if available
    if topic_data:
        prompt += "TOPIC OVERVIEW:\n"
        
        # Add positive topics
        if topic_data.get("positive"):
            prompt += "POSITIVE TOPICS:\n"
            for topic in topic_data["positive"]:
                prompt += f"- {topic.get('one_sentence_summary')}\n"
            prompt += "\n"
            
        # Add neutral topics
        if topic_data.get("neutral"):
            prompt += "NEUTRAL TOPICS:\n"
            for topic in topic_data["neutral"]:
                prompt += f"- {topic.get('one_sentence_summary')}\n"
            prompt += "\n"
            
        # Add negative topics
        if topic_data.get("negative"):
            prompt += "NEGATIVE TOPICS:\n"
            for topic in topic_data["negative"]:
                prompt += f"- {topic.get('one_sentence_summary')}\n"
            prompt += "\n"
    
    # Add the RAG context and user query
    prompt += f"""    
CONTEXT:
{rag_results}

USER QUERY:
{user_query}

INSTRUCTIONS:
1. Answer the user's query based ONLY on the information provided in the context.
2. If the context doesn't contain enough information to answer the query, say "I don't have enough information to answer this question."
3. Do not make up information or use knowledge outside of the provided context.
4. For every piece of evidence you cite, add a reference at the end of the sentence in the format [postID] where postID is the exact ID of the source document.
5. Example of proper reference: "Users are experiencing battery life issues with the device [qpmkvr]."
6. Make sure all postID references are accurate and correspond to actual post IDs from the provided context.
7. Do not modify the postID format - keep it exactly as shown in the context (do not add extra characters or modify the ID).
8. Organize your response using markdown section headers (##) to categorize different perspectives.
9. Use headers like "## Positive Perspectives", "## Criticisms", "## Feature Requests", "## Common Issues", etc. as appropriate for the query.
10. Under each section header, provide a bulleted list explaining the key points with references.


ANSWER:
"""

    return prompt

