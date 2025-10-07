# CRITICAL: Video Analyzer OpenAI API Key Fix

## Problem Identified
The Video Analyzer is using the WRONG OpenAI API key:
- ❌ **WRONG KEY** (being used): Ends in "QnYA"
- ✅ **CORRECT KEY** (should use): Ends in "NPkA"

## Root Cause
The wrong API key is set as an environment variable in your shell/system, which overrides the .env file when Docker Compose runs.

## Immediate Fix

### Option 1: Run this command before starting services
```bash
unset OPENAI_API_KEY
export OPENAI_API_KEY="***REDACTED-OPENAI-KEY***"
docker compose -f docker-compose-all.yml restart video-analyzer
```

### Option 2: Use the fix script
```bash
chmod +x fix_video_analyzer_key.sh
./fix_video_analyzer_key.sh
```

## Permanent Fix Required

### 1. Find where the wrong key is set
Check these locations for the wrong OpenAI key:
- Your shell profile (`~/.bashrc`, `~/.bash_profile`, `~/.profile`)
- System environment variables (Windows Environment Variables)
- Any Claude extension settings
- Docker Desktop environment settings

### 2. Remove the wrong key
Once found, remove or update the line that sets:
```
OPENAI_API_KEY=***REDACTED-OPENAI-KEY***...QnYA
```

### 3. Ensure correct key in .env
Your `.env` file has the correct key ending in "NPkA" - this is good.

### 4. Restart Docker services
After removing the wrong environment variable:
```bash
docker compose -f docker-compose-all.yml down
docker compose -f docker-compose-all.yml up -d
```

## Testing

After fixing, test the Video Analyzer:
1. Go to http://localhost:5002
2. Try transcribing a YouTube video
3. It should work without the "Incorrect API key" error

## Why This Happened

Docker Compose prioritizes environment variables in this order:
1. Shell environment variables (YOUR PROBLEM - wrong key here)
2. .env file (correct key here)
3. docker-compose.yml defaults
4. docker-compose.override.yml (also has correct key)

The wrong key in your shell environment (#1) is overriding everything else.

## Action Items

1. **IMMEDIATE**: Run the fix commands above
2. **IMPORTANT**: Find and remove the wrong OPENAI_API_KEY from your system
3. **VERIFY**: Test video transcription works
4. **PREVENT**: Never set API keys as system environment variables - use .env files only