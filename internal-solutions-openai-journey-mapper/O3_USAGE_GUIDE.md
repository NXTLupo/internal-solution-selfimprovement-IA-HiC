# OpenAI o3 Implementation for Journey Mapper

This document explains how the Journey Mapper uses OpenAI's specialized o3 reasoning model for generating detailed, interactive customer journey maps.

## What is o3?

o3 is OpenAI's specialized reasoning model designed for complex, multi-step problem solving. Unlike standard models like GPT-4o, o3 is specifically built to:

- Solve complex multi-step problems with deep reasoning
- Perform detailed analysis of data
- Handle nuanced visual and textual inputs
- Use specialized reasoning capabilities for better results

## Technical Implementation

The Journey Mapper has been updated to use o3 by default, with fallback options to GPT-4o when needed.

### Key Components

1. **API Wrapper**: Uses OpenAI's `responses.create` API endpoint specific to o3 instead of the standard chat completions API.

2. **Reasoning Parameters**: Configures o3's reasoning capabilities with:
   - `reasoning_effort`: Controls the depth of reasoning (low, medium, high)
   - `max_completion_tokens`: Manages token usage and costs

3. **Token Handling**: Tracks and logs reasoning tokens, which are an additional component of o3's processing model.

4. **Organization Verification**: Automatically checks if your OpenAI organization is verified for o3 access.

## Usage

To use o3 with the Journey Mapper, you need:

1. An OpenAI API key with access to the o3 model
2. An organization that has been verified for o3 usage

The system will automatically:
- Verify o3 access on startup
- Fall back to GPT-4o if o3 is not available
- Configure optimal reasoning parameters

## Configuration Options

You can customize the o3 implementation using environment variables:

| Variable | Default | Options | Description |
|----------|---------|---------|-------------|
| `OPENAI_MODEL` | `"o3"` | `"o3"`, `"gpt-4o"`, `"gpt-4-turbo"`, `"gpt-4"` | Model to use |
| `REASONING_EFFORT` | `"medium"` | `"low"`, `"medium"`, `"high"` | Depth of reasoning |

## Cost Management

o3 uses reasoning tokens in addition to standard input/output tokens, which affects pricing. The implementation:

1. Logs token usage statistics
2. Caps maximum completion tokens to control costs
3. Allows adjusting reasoning effort to balance quality vs. cost

## Best Practices

For optimal results with o3:

1. Keep prompts concise and clear - o3 doesn't need elaborate instructions
2. Avoid chain-of-thought prompts - o3 handles reasoning internally
3. For complex analyses, use the "high" reasoning effort setting
4. For quicker results with lower costs, use "low" or "medium" reasoning

## Fallback Mechanism

If o3 is not available (due to organization verification or other issues), the system will:

1. Log a warning
2. Automatically fall back to GPT-4o
3. Continue to function without interruption

## Technical Notes

- o3 requires the latest OpenAI SDK (v1.21.0+)
- The reasoning parameters apply only to o3, not fallback models
- Token usage statistics are saved in debug logs for analysis