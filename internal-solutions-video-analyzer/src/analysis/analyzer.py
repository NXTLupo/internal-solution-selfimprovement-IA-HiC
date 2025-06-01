from typing import List, Optional, Dict, Any
import asyncio
import logging
import time
import re

from ..models import (
    TranscriptionResult, VideoInfo, AnalysisResult, 
    Theme, ThemeEvidence, Insight, AnalysisType
)
from ..utils.prompts import (
    format_summarization_prompt, format_theme_prompt, 
    format_insight_prompt, format_keyword_prompt,
    SUMMARIZATION_SYSTEM_PROMPT, THEME_IDENTIFICATION_SYSTEM_PROMPT,
    INSIGHT_GENERATION_SYSTEM_PROMPT, KEYWORD_EXTRACTION_SYSTEM_PROMPT,
    chunk_transcript
)
from ..utils.llm_client import get_llm_completion

logger = logging.getLogger("video-analyzer.analyzer")

async def analyze_transcript(
    transcription: TranscriptionResult,
    analysis_types: List[AnalysisType],
    video_info: Optional[VideoInfo] = None,
    use_local_llm: bool = False
) -> AnalysisResult:
    """
    Analyze a transcript using AI models.
    
    Args:
        transcription: The transcription result
        analysis_types: Types of analysis to perform
        video_info: Video metadata if available
        use_local_llm: Whether to use a local LLM instead of API
        
    Returns:
        Analysis results
    """
    # Default to all analysis types if "all" is specified
    if AnalysisType.ALL in analysis_types:
        analysis_types = [AnalysisType.SUMMARY, AnalysisType.THEMES, AnalysisType.INSIGHTS, AnalysisType.KEYWORDS]
    
    # Remove duplicates and "all"
    analysis_types = [t for t in analysis_types if t != AnalysisType.ALL]
    analysis_types = list(set(analysis_types))
    
    logger.info(f"Starting analysis with types: {analysis_types}")
    
    # For very long transcripts, use chunking
    full_text = transcription.text
    video_title = video_info.title if video_info else None
    
    # Track results
    results = {}
    
    # Run analysis tasks concurrently
    tasks = []
    
    if AnalysisType.SUMMARY in analysis_types:
        logger.info("Adding summary generation task")
        tasks.append(generate_summary(full_text, video_title, use_local_llm))
        
    if AnalysisType.THEMES in analysis_types:
        logger.info("Adding theme identification task")
        tasks.append(identify_themes(full_text, video_title, use_local_llm))
        
    if AnalysisType.INSIGHTS in analysis_types:
        logger.info("Adding insight generation task")
        tasks.append(generate_insights(full_text, video_title, use_local_llm))
        
    if AnalysisType.KEYWORDS in analysis_types:
        logger.info("Adding keyword extraction task")
        tasks.append(extract_keywords(full_text, video_title, use_local_llm))
    
    # Wait for all tasks to complete
    logger.info(f"Running {len(tasks)} analysis tasks concurrently")
    results_list = await asyncio.gather(*tasks)
    
    # Combine results
    for i, analysis_type in enumerate([t for t in analysis_types if t in [
        AnalysisType.SUMMARY, AnalysisType.THEMES, AnalysisType.INSIGHTS, AnalysisType.KEYWORDS
    ]]):
        results[analysis_type.value] = results_list[i]
    
    # Create analysis result object
    logger.info("Analysis complete, creating result object")
    return AnalysisResult(
        summary=results.get(AnalysisType.SUMMARY.value, ""),
        themes=results.get(AnalysisType.THEMES.value, []),
        insights=results.get(AnalysisType.INSIGHTS.value, []),
        keywords=results.get(AnalysisType.KEYWORDS.value, [])
    )

async def generate_summary(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> str:
    """Generate a summary of the transcript."""
    logger.info(f"Generating summary for transcript ({len(text)} chars)")
    
    # For long texts, use chunking
    if len(text.split()) > 3000:
        logger.info("Text is long, using chunking for summarization")
        return await generate_summary_for_long_text(text, video_title, use_local_llm)
    
    # Prepare prompt
    prompt = format_summarization_prompt(text, video_title)
    
    # Get completion
    response = await get_llm_completion(prompt, SUMMARIZATION_SYSTEM_PROMPT, use_local_llm)
    
    logger.info(f"Generated summary ({len(response)} chars)")
    return response.strip()

async def generate_summary_for_long_text(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> str:
    """Generate summary for a long text by chunking."""
    # Split into chunks
    chunks = chunk_transcript(text)
    logger.info(f"Split long text into {len(chunks)} chunks for summarization")
    
    # Summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        logger.info(f"Summarizing chunk {i+1}/{len(chunks)}")
        chunk_prompt = f"""
        This is part {i+1} of {len(chunks)} from a longer transcript.
        
        Please provide a concise summary of this segment.
        
        TRANSCRIPT SEGMENT:
        {chunk}
        """
        
        response = await get_llm_completion(chunk_prompt, SUMMARIZATION_SYSTEM_PROMPT, use_local_llm)
        chunk_summaries.append(response.strip())
    
    # Combine chunk summaries
    combined_summary = "\n\n".join(chunk_summaries)
    
    # Create final synthesis prompt
    logger.info("Creating final synthesis of chunk summaries")
    final_prompt = f"""
    You have been provided with summaries of {len(chunks)} segments of a longer transcript.
    Please synthesize these summaries into a coherent, comprehensive summary.
    
    The transcript is from a video titled: {video_title or "Unknown"}
    
    SEGMENT SUMMARIES:
    {combined_summary}
    
    Please create a unified summary that captures the key points and flow of the entire transcript.
    """
    
    # Get final summary
    response = await get_llm_completion(final_prompt, SUMMARIZATION_SYSTEM_PROMPT, use_local_llm)
    
    logger.info(f"Generated final synthesis summary ({len(response)} chars)")
    return response.strip()

async def identify_themes(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> List[Theme]:
    """Identify key themes in the transcript."""
    logger.info(f"Identifying themes in transcript ({len(text)} chars)")
    
    # Prepare prompt
    prompt = format_theme_prompt(text, video_title)
    
    # Get completion
    response = await get_llm_completion(prompt, THEME_IDENTIFICATION_SYSTEM_PROMPT, use_local_llm)
    
    # Parse themes from response
    themes = parse_themes_from_response(response)
    logger.info(f"Identified {len(themes)} themes")
    return themes

async def generate_insights(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> List[Insight]:
    """Generate insights from the transcript."""
    logger.info(f"Generating insights from transcript ({len(text)} chars)")
    
    # Prepare prompt
    prompt = format_insight_prompt(text, video_title)
    
    # Get completion
    response = await get_llm_completion(prompt, INSIGHT_GENERATION_SYSTEM_PROMPT, use_local_llm)
    
    # Parse insights from response
    insights = parse_insights_from_response(response)
    logger.info(f"Generated {len(insights)} insights")
    return insights

async def extract_keywords(
    text: str,
    video_title: Optional[str] = None,
    use_local_llm: bool = False
) -> List[str]:
    """Extract keywords from the transcript."""
    logger.info(f"Extracting keywords from transcript ({len(text)} chars)")
    
    # Prepare prompt
    prompt = format_keyword_prompt(text, video_title)
    
    # Get completion
    response = await get_llm_completion(prompt, KEYWORD_EXTRACTION_SYSTEM_PROMPT, use_local_llm)
    
    # Parse keywords from response
    keywords = [k.strip() for k in response.split(',')]
    keywords = [k for k in keywords if k]  # Filter out empty strings
    logger.info(f"Extracted {len(keywords)} keywords")
    return keywords

def parse_themes_from_response(response: str) -> List[Theme]:
    """Parse themes from LLM response."""
    logger.debug(f"Parsing themes from response ({len(response)} chars)")
    lines = response.strip().split('\n')
    themes = []
    
    current_theme = None
    current_description = []
    current_evidence = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect theme heading (assume starts with number or heading marker)
        if line.startswith(('#', '##', '###', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '-', '*', '•')):
            # Save previous theme if exists
            if current_theme:
                themes.append(Theme(
                    title=current_theme,
                    description='\n'.join(current_description),
                    evidence=[ThemeEvidence(text=e) for e in current_evidence]
                ))
            
            # Extract theme title
            parts = line.split(':', 1)
            if len(parts) > 1:
                # Remove markers and numbering
                title = parts[1].strip()
            else:
                # Remove markers and numbering
                title = line.lstrip('#*•-0123456789. ').strip()
                
            current_theme = title
            current_description = []
            current_evidence = []
            
        elif line.startswith(('Example:', 'Evidence:', 'Quote:')):
            # Evidence line
            evidence_text = line.split(':', 1)[1].strip()
            current_evidence.append(evidence_text)
            
        elif line.startswith('>') or line.startswith('"'):
            # Quote/evidence
            current_evidence.append(line.lstrip('> "').rstrip('"'))
            
        else:
            # Description
            current_description.append(line)
    
    # Add the last theme
    if current_theme:
        themes.append(Theme(
            title=current_theme,
            description='\n'.join(current_description),
            evidence=[ThemeEvidence(text=e) for e in current_evidence]
        ))
    
    return themes

def parse_insights_from_response(response: str) -> List[Insight]:
    """Parse insights from LLM response."""
    logger.debug(f"Parsing insights from response ({len(response)} chars)")
    lines = response.strip().split('\n')
    insights = []
    
    current_insight = None
    current_description = []
    current_evidence = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect insight heading (assume starts with number or heading marker)
        if line.startswith(('#', '##', '###', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '-', '*', '•')):
            # Save previous insight if exists
            if current_insight:
                insights.append(Insight(
                    title=current_insight,
                    description='\n'.join(current_description),
                    evidence='\n'.join(current_evidence)
                ))
            
            # Extract insight title
            parts = line.split(':', 1)
            if len(parts) > 1:
                # Remove markers and numbering
                title = parts[1].strip()
            else:
                # Remove markers and numbering
                title = line.lstrip('#*•-0123456789. ').strip()
                
            current_insight = title
            current_description = []
            current_evidence = []
            
        elif line.startswith(('Example:', 'Evidence:', 'Quote:', 'Support:')):
            # Evidence line
            evidence_text = line.split(':', 1)[1].strip()
            current_evidence.append(evidence_text)
            
        elif line.startswith('>') or line.startswith('"'):
            # Quote/evidence
            current_evidence.append(line.lstrip('> "').rstrip('"'))
            
        else:
            # Description
            current_description.append(line)
    
    # Add the last insight
    if current_insight:
        insights.append(Insight(
            title=current_insight,
            description='\n'.join(current_description),
            evidence='\n'.join(current_evidence)
        ))
    
    return insights