"""
LLM Prompts for Video Analysis Tasks

This module contains prompt templates for various video analysis tasks
using Claude 3.7 Sonnet or other LLMs.
"""

# Formatting constants
SYSTEM_PROMPT_BASE = """You are an AI assistant specialized in analyzing video transcripts. 
Your task is to provide insightful, accurate, and concise analysis of the provided transcript.
Focus on the content of the transcript without speculation beyond what is explicitly mentioned.
"""

# =============================
# Summarization Prompts
# =============================

SUMMARIZATION_SYSTEM_PROMPT = SYSTEM_PROMPT_BASE + """
You will create a concise but comprehensive summary of the transcript.
Capture the key points, main ideas, and essential information.
Use clear, direct language and maintain the original meaning and intent.
Do not add information that is not in the transcript.
"""

SUMMARIZATION_PROMPT = """
Please provide a comprehensive summary of the following video transcript. 
Capture the main points, key arguments, and essential details in about {word_count} words.

The transcript is from a video titled: {video_title}

TRANSCRIPT:
{transcript}

Please respond with a well-structured summary that accurately represents the content.
"""

SUMMARIZATION_PROMPT_LONG = """
Please summarize the following video transcript in about {word_count} words.

This is a transcript from a video titled: {video_title}

Your summary should:
1. Capture the main points and key ideas discussed
2. Present the information in a logical flow
3. Maintain the original meaning and context
4. Be concise yet comprehensive

TRANSCRIPT:
{transcript}

Begin your response with a brief overview paragraph, followed by the main points organized 
in a coherent structure. Do not add information not present in the transcript.
"""

# =============================
# Theme Identification Prompts
# =============================

THEME_IDENTIFICATION_SYSTEM_PROMPT = SYSTEM_PROMPT_BASE + """
You will identify recurring themes and major topics from the video transcript.
Focus on patterns, repeated concepts, and significant subject areas discussed.
For each theme, provide brief supporting evidence from the transcript.
Organize themes by importance or prevalence in the discussion.
"""

THEME_IDENTIFICATION_PROMPT = """
Please identify the main themes and recurring topics in the following video transcript.

The transcript is from a video titled: {video_title}

For each theme you identify:
1. Provide a clear name/title for the theme
2. Include a brief 1-2 sentence description of what this theme encompasses
3. Include 1-3 brief examples or quotes from the transcript that demonstrate this theme

Identify between {min_themes} and {max_themes} distinct themes.

TRANSCRIPT:
{transcript}

Format your response as a list of themes with their descriptions and supporting evidence.
"""

# =============================
# Insight Generation Prompts
# =============================

INSIGHT_GENERATION_SYSTEM_PROMPT = SYSTEM_PROMPT_BASE + """
You will generate key insights from the video transcript.
An insight is a meaningful observation that reveals something significant, 
a pattern, or an important takeaway that might not be immediately obvious.
Each insight should be supported by evidence from the transcript.
Focus on depth rather than breadth - provide substantial insights with supporting evidence.
"""

INSIGHT_GENERATION_PROMPT = """
Based on the following video transcript, please identify {num_insights} key insights.

The transcript is from a video titled: {video_title}

For each insight:
1. State the insight clearly in a concise sentence
2. Provide a brief explanation of why this insight is significant
3. Include specific evidence from the transcript that supports this insight
4. If applicable, note any implications this insight might have

Look for insights related to:
- Important revelations or discoveries
- Underlying patterns or trends
- Contradictions or tensions
- Unique perspectives or approaches
- Valuable lessons or takeaways

TRANSCRIPT:
{transcript}

Format your response as a numbered list of insights with explanations and supporting evidence.
"""

# =============================
# Keyword Extraction Prompts
# =============================

KEYWORD_EXTRACTION_SYSTEM_PROMPT = SYSTEM_PROMPT_BASE + """
You will extract the most relevant and important keywords from the video transcript.
Focus on terms that capture the essential topics, concepts, and subjects discussed.
Prioritize specificity and relevance over general terms.
Include a mix of technical terms, names, concepts, and descriptive phrases if applicable.
"""

KEYWORD_EXTRACTION_PROMPT = """
Please extract the {num_keywords} most important keywords or key phrases from the following video transcript.

The transcript is from a video titled: {video_title}

Guidelines for keyword selection:
1. Focus on words/phrases that are central to the main topics discussed
2. Include specific technical terms or jargon relevant to the subject matter
3. Include names of people, places, products, or concepts if they are significant
4. Prioritize terms that appear frequently or are emphasized in the discussion
5. Choose keywords that would be useful for categorizing or searching for this content

TRANSCRIPT:
{transcript}

Format your response as a simple comma-separated list of keywords. Do not number them or add explanations.
"""

# =============================
# Chunking for Long Transcripts
# =============================

CHUNK_INTRODUCTION = """
This is part {chunk_num} of {total_chunks} from a longer transcript.

"""

CHUNK_SUMMARIZATION_PROMPT = """
You are summarizing a long transcript in multiple parts. This is part {chunk_num} of {total_chunks}.

Please provide a concise summary of this segment of the transcript.

TRANSCRIPT SEGMENT:
{transcript_chunk}

Summarize this segment in about {chunk_summary_length} words, focusing on key points and important details.
"""

FINAL_SYNTHESIS_PROMPT = """
You have been provided with summaries of {total_chunks} segments of a longer transcript.
Please synthesize these summaries into a coherent, comprehensive summary of the entire transcript.

The transcript is from a video titled: {video_title}

SEGMENT SUMMARIES:
{segment_summaries}

Please create a unified summary of approximately {final_summary_length} words that captures 
the key points and flow of the entire transcript. Organize the information logically and 
ensure the summary reads as a cohesive whole, not as separate segments.
"""

# =============================
# Helper Functions
# =============================

def chunk_transcript(transcript, max_tokens=4000, overlap=200):
    """
    Split a long transcript into chunks for processing.
    
    Args:
        transcript (str): Full transcript text
        max_tokens (int): Maximum tokens per chunk
        overlap (int): Number of tokens to overlap between chunks
        
    Returns:
        list: List of transcript chunks
    """
    # Simple estimation: 1 token ≈ 4 characters
    words = transcript.split()
    tokens_per_word = 1.3  # Rough estimate
    words_per_chunk = int(max_tokens / tokens_per_word)
    overlap_words = int(overlap / tokens_per_word)
    
    chunks = []
    for i in range(0, len(words), words_per_chunk - overlap_words):
        chunk = ' '.join(words[i:i + words_per_chunk])
        chunks.append(chunk)
    
    return chunks

def format_summarization_prompt(transcript, video_title=None, word_count=300):
    """Format the summarization prompt with the transcript."""
    return SUMMARIZATION_PROMPT.format(
        transcript=transcript,
        video_title=video_title or "Unknown",
        word_count=word_count
    )

def format_theme_prompt(transcript, video_title=None, min_themes=3, max_themes=7):
    """Format the theme identification prompt with the transcript."""
    return THEME_IDENTIFICATION_PROMPT.format(
        transcript=transcript,
        video_title=video_title or "Unknown",
        min_themes=min_themes,
        max_themes=max_themes
    )

def format_insight_prompt(transcript, video_title=None, num_insights=5):
    """Format the insight generation prompt with the transcript."""
    return INSIGHT_GENERATION_PROMPT.format(
        transcript=transcript,
        video_title=video_title or "Unknown",
        num_insights=num_insights
    )

def format_keyword_prompt(transcript, video_title=None, num_keywords=15):
    """Format the keyword extraction prompt with the transcript."""
    return KEYWORD_EXTRACTION_PROMPT.format(
        transcript=transcript,
        video_title=video_title or "Unknown",
        num_keywords=num_keywords
    )

# =============================
# Messages Formatters for APIs
# =============================

def format_anthropic_messages(prompt, system_prompt):
    """Format messages for Anthropic Claude API."""
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

def format_openai_messages(prompt, system_prompt):
    """Format messages for OpenAI API."""
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

def format_local_llm_prompt(prompt, system_prompt):
    """Format prompt for local LLMs."""
    return f"""### System:
{system_prompt}

### User:
{prompt}

### Assistant:
"""