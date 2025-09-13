#!/usr/bin/env python3
"""
Fix OpenAI API key format in .env file
"""
import os
import re

def fix_openai_api_key():
    """Fix the OpenAI API key format in .env file"""
    env_file = ".env"
    
    if not os.path.exists(env_file):
        print(f"Error: {env_file} file not found")
        return False
    
    # Read the .env file
    with open(env_file, "r") as f:
        content = f.read()
    
    # Check if there are multiple API keys concatenated
    if "OPENAI_API_KEY=" in content:
        # Extract the current OPENAI_API_KEY line
        match = re.search(r"OPENAI_API_KEY=(.*?)(\n|$)", content)
        if match:
            current_key = match.group(1)
            
            # Check if the key appears to have multiple keys concatenated
            if len(current_key) > 100 and "\n" in current_key:
                print("Found concatenated API keys, fixing...")
                
                # Extract the first part of the key (before any newlines or other keys)
                # This is specific to the error where the API key has Azure keys appended
                fixed_key = current_key.split("\n")[0].strip()
                
                # Replace the old key with the fixed key
                new_content = re.sub(
                    r"OPENAI_API_KEY=(.*?)(\n|$)", 
                    f"OPENAI_API_KEY={fixed_key}\n", 
                    content, 
                    flags=re.DOTALL
                )
                
                # Write the updated content back to the .env file
                with open(env_file, "w") as f:
                    f.write(new_content)
                    
                print(f"Fixed OpenAI API key in {env_file}")
                print(f"New key: {fixed_key[:5]}...{fixed_key[-5:]}")
                return True
            else:
                print("OpenAI API key looks fine")
                return True
    
    print("No OpenAI API key found in .env file")
    return False

if __name__ == "__main__":
    print("Fixing OpenAI API key format...")
    if fix_openai_api_key():
        print("Done!")
    else:
        print("Failed to fix OpenAI API key")