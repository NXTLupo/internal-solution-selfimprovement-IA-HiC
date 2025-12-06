"""
Content selector functionality for Journey Mapper.
Helper methods for handling content selection in journey maps.
"""

import re

def remove_section_from_html(html_content, class_name, tag_types=["div", "section"]):
    """
    Remove sections from HTML based on CSS class names.
    
    Args:
        html_content (str): The HTML content to modify
        class_name (str): The CSS class name to target
        tag_types (list): List of HTML tag types to check for the class
        
    Returns:
        str: The modified HTML content with matching sections removed
    """
    modified_html = html_content
    
    # Attempt to find and remove elements by class name for each tag type
    for tag_type in tag_types:
        # Pattern to find elements by class, handling potential whitespace in class lists
        pattern = rf'<{tag_type}[^>]*class=\"[^\"]*\b{re.escape(class_name)}\b[^\"]*\"[^>]*>.*?</{tag_type}>'
        
        # Remove the matched sections
        modified_html = re.sub(pattern, '', modified_html, flags=re.DOTALL)
        
        # Also try with single quotes for class attribute
        pattern_single = rf"<{tag_type}[^>]*class='[^']*\b{re.escape(class_name)}\b[^']*'[^>]*>.*?</{tag_type}>"
        modified_html = re.sub(pattern_single, '', modified_html, flags=re.DOTALL)
    
    return modified_html