#!/usr/bin/env python3
"""
Test file format detection and conversion for journey mapper
"""

def detect_file_format(file_path_or_content):
    """Detect if content is HTML, JSON, or other format"""
    if isinstance(file_path_or_content, str):
        content = file_path_or_content
    else:
        content = str(file_path_or_content)
    
    content_lower = content.lower().strip()
    
    if content_lower.startswith('<!doctype html') or content_lower.startswith('<html'):
        return 'HTML'
    elif content_lower.startswith('{') or content_lower.startswith('['):
        return 'JSON'
    elif 'json' in content_lower[:100]:
        return 'JSON'
    else:
        return 'UNKNOWN'

def extract_journey_data_from_html(html_content):
    """Extract meaningful journey data from HTML"""
    # Simple extraction - in practice this would be more sophisticated
    import re
    
    # Extract title
    title_match = re.search(r'<title>(.*?)</title>', html_content, re.IGNORECASE)
    title = title_match.group(1) if title_match else "Untitled Journey"
    
    # Extract description from meta tag
    desc_match = re.search(r'<meta name="description" content="(.*?)"', html_content, re.IGNORECASE)
    description = desc_match.group(1) if desc_match else "Journey map analysis"
    
    # Extract key quotes and insights
    quote_pattern = r'<div class="quote">.*?<p>(.*?)</p>'
    quotes = re.findall(quote_pattern, html_content, re.DOTALL | re.IGNORECASE)
    
    # Create JSON structure for journey mapper
    journey_data = {
        "title": title,
        "description": description,
        "content_type": "journey_map_html_extract",
        "key_insights": quotes[:5] if quotes else [],
        "source": "HTML Journey Map Conversion",
        "analysis_request": "Please analyze this existing journey map and provide insights or create an enhanced version"
    }
    
    return journey_data

# Test with the user's HTML content
html_sample = '''<!DOCTYPE html>
<!-- saved from url=(0089)https://localhost:8444/journey_maps/journey_map_bc1f8852-454c-4b05-8cf6-f06df392ddf7.html -->
<html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="A comprehensive journey map of GPT-5 development and AI agent evolution based on David Shapiro&#39;s analysis">
    <title>GPT-5 and AI Agent Evolution Journey Map</title>'''

print("File Format Detection Test")
print("=" * 40)
print(f"Detected format: {detect_file_format(html_sample)}")
print()

print("Extracted Journey Data:")
print("=" * 40)
journey_data = extract_journey_data_from_html(html_sample)
import json
print(json.dumps(journey_data, indent=2))