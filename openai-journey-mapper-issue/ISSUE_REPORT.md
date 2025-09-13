# OpenAI Journey Mapper Format String Error Analysis

## Issue Description

The OpenAI Journey Mapper component within the NXT HUMANS AI CX WORKBENCH fails with an **"Invalid format specifier"** error when attempting to generate journey maps with any OpenAI model (o1, gpt-4o, etc.). This critical error prevents the journey mapping functionality from working properly.

The error message displayed to users is:
```
Journey Analysis Summary
Error with o1: Invalid format specifier
Journey Map Generation Failed
An error occurred while generating the journey map:

Invalid format specifier
```

## Root Cause Analysis

The issue is related to Python f-string formatting in the dynamic_journey_mapper.py and app.py files. F-strings containing curly braces from user-generated content or error messages are causing format string errors.

Specifically:
1. When error messages or user content contains curly braces `{}`, these are interpreted as format specifiers within f-strings
2. Since these curly braces don't have corresponding format values, Python raises the "Invalid format specifier" error
3. Multiple places in the code use f-strings to format HTML, error messages, and summaries which are vulnerable to this issue

## Failed Solutions

I attempted multiple fixes to resolve the issue:

1. **First Attempt**: Modified f-strings in app.py to use safer string concatenation for model_info_html:
   ```python
   model_info_html = """<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
     Generated with <strong>""" + model_display + """</strong> on """ + date_display + """</div>
   ```

2. **Second Attempt**: Fixed the summary_html in app.py using the same safer approach:
   ```python
   summary_html = """<div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4264D0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
       <h2 style="color: #4264D0; margin-top: 0; font-size: 1.4rem;">Journey Analysis Summary</h2>
       <div style="white-space: pre-line; font-size: 0.95rem; line-height: 1.6;">""" + summary_content + """</div>
   </div>
   ```

3. **Third Attempt**: Updated dynamic_journey_mapper.py to build the reasoning_label without using f-strings:
   ```python
   # Build reasoning label without f-string to avoid potential format issues
   reasoning_label = ""
   if is_o_series:
       reasoning_label = "with " + str(self.reasoning_effort) + " reasoning effort"
   ```

4. **Fourth Attempt**: Modified the model_info_html in dynamic_journey_mapper.py to use string concatenation:
   ```python
   model_info_html = """
   <div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
     Generated with <strong>OpenAI """ + actual_model + """</strong> """ + (reasoning_label if reasoning_label else "") + """ on """ + date_display + """
   </div>
   """
   ```

5. **Fifth Attempt**: Rewrote the error_html generation in dynamic_journey_mapper.py to avoid f-strings completely by breaking it into parts and using string concatenation.

Despite these changes, the error persists. The issue must be occurring in a part of the code that I haven't identified or fixed properly.

## Key Files

The main files involved in this issue are:

1. `/internal-solutions-openai-journey-mapper/src/ai_analysis/dynamic_journey_mapper.py` - Contains the core journey mapping functionality 
2. `/internal-solutions-openai-journey-mapper/src/app.py` - FastAPI application that handles requests
3. `/internal-solutions-openai-journey-mapper/openai_api_wrapper.py` - Wrapper for OpenAI API calls

## Next Steps for the AI Architect

1. Conduct a thorough search for all instances of f-strings in the codebase that might handle user-generated content
2. Review the error handling flow from end-to-end to identify where the format string error originates
3. Consider implementing a global exception handler that sanitizes all error messages before formatting
4. Test with input that intentionally contains curly braces to verify the fix
5. Review the journey map generation process to ensure all string formatting is safe from user input

## Project Structure

For your convenience, I've included the relevant code files in this folder:
- dynamic_journey_mapper.py
- app.py
- openai_api_wrapper.py

These files contain the key components that need to be fixed to resolve the format string error. I've made several attempts to fix these files, but the issue persists, suggesting there may be deeper issues or additional locations where format strings are vulnerable.