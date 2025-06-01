# OpenAI o3 Reasoning Model Implementation Guide

This guide provides detailed information about the implementation of OpenAI's o3 reasoning model in the NXT Humans AI CX Workbench, specifically for the OpenAI Journey Mapper application.

## What is o3?

o3 is OpenAI's specialized reasoning model designed to solve complex multi-step problems that require deep analysis. Unlike generalist models like GPT-4o, o3 is specifically optimized for:

1. Solving complex multi-step problems requiring structured analysis
2. Blending visual and textual input for comprehensive understanding
3. Using tools like Python, search, or image inspection when needed
4. Producing detailed reasoning traces to explain its thought process

## API Differences

The o3 model uses a different API endpoint than standard OpenAI models:

| Feature | Standard Models | o3 Model |
|---------|----------------|----------|
| API Endpoint | `chat.completions.create` | `responses.create` |
| Primary Parameter | `messages` | `inputs` |
| Output Format | `choices[0].message.content` | `content` |
| System Message | Separate message type | Part of the `inputs` object |
| Reasoning | Not available | `reasoning_tokens` in response |

## Organization Verification

Access to o3 requires organization verification with OpenAI:

1. Only organizations that have been verified can access o3
2. The implementation includes a verification check
3. If verification fails, the system automatically falls back to GPT-4o

```python
def check_organization_verification():
    """Check if the organization is verified for o3 access."""
    try:
        client = OpenAI()
        response = client.responses.create(
            inputs=[{"text": "Test verification"}],
            model="o3",
            reasoning_effort="low",
            max_tokens=10
        )
        return True
    except Exception as e:
        if "not authorized" in str(e).lower():
            return False
        # Other errors might be temporary, so we don't fail verification
        return True
```

## Reasoning Parameters

The o3 model supports configurable reasoning parameters:

| Parameter | Description | Options |
|-----------|-------------|---------|
| `reasoning_effort` | Controls the depth of reasoning | "low", "medium", "high" |
| `reasoning_tokens` | Tokens used for internal reasoning | Returned in response |

These parameters control how much effort o3 puts into solving a problem. For journey mapping, we use "medium" by default, which provides a good balance between cost and quality.

## Implementation Details

### OpenAI API Wrapper

The `openai_api_wrapper.py` file implements the interface to o3:

```python
def openai_api_call(
    prompt: str,
    model: str = "o3",  # Using o3 - OpenAI's specialized reasoning model
    max_tokens: int = 4000,
    temperature: float = 0.7,
    system_message: str = "You are a helpful assistant.",
    reasoning_effort: str = "medium",  # Options: "low", "medium", "high"
    retry_count: int = 3,
    retry_delay: int = 5,
    json_mode: bool = False
):
    """
    Call the OpenAI API with retry logic and o3 specialized reasoning model support.
    
    If using o3 model, this will use the responses.create API instead of chat.completions.create.
    If organization is not verified for o3, it will fall back to gpt-4o.
    """
    client = OpenAI()
    
    # Determine if we're using o3 or a standard model
    is_o3 = model.lower() == "o3"
    
    # Initialize retry counter
    attempts = 0
    last_exception = None
    
    while attempts < retry_count:
        try:
            if is_o3:
                # Use responses.create API for o3
                response = client.responses.create(
                    inputs=[
                        {
                            "role": "system",
                            "text": system_message
                        },
                        {
                            "role": "user",
                            "text": prompt
                        }
                    ],
                    model=model,
                    reasoning_effort=reasoning_effort,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    response_format={"type": "json_object"} if json_mode else None
                )
                return response.content
            else:
                # Use standard chat.completions.create API for other models
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=max_tokens,
                    temperature=temperature,
                    response_format={"type": "json_object"} if json_mode else None
                )
                return response.choices[0].message.content
                
        except Exception as e:
            last_exception = e
            attempts += 1
            
            # Handle specific exceptions
            if "not authorized" in str(e).lower() and is_o3:
                # Fall back to GPT-4o if not authorized for o3
                logging.warning(f"Organization not authorized for o3. Falling back to gpt-4o.")
                model = "gpt-4o"
                is_o3 = False
                continue
                
            # Wait before retrying
            time.sleep(retry_delay)
    
    # If we get here, all retries failed
    logging.error(f"Failed to call OpenAI API after {retry_count} attempts. Last error: {last_exception}")
    raise last_exception
```

### Dynamic Journey Mapper Integration

The `dynamic_journey_mapper.py` file integrates with o3 by:

1. Importing the OpenAI API wrapper
2. Setting token limits appropriate for o3
3. Adding verification and fallback mechanisms
4. Configuring reasoning parameters based on environment variables

```python
def _call_openai_api(self, prompt: str, *, max_tokens: int = OPENAI_MAX_OUTPUT_TOKENS) -> str:
    system_message = "You are an expert journey‑mapping specialist. Output only HTML."
    try:
        # Verify organization access to o3 if this is the first call
        if self.openai_model == "o3" and getattr(self, "_o3_verified", None) is None:
            from openai_api_wrapper import check_organization_verification
            is_verified = check_organization_verification()
            self._o3_verified = is_verified
            
            if not is_verified:
                self.logger.warning("Organization not verified for o3. Using fallback model.")
                self.openai_model = "gpt-4o"  # Fallback to gpt-4o if o3 is not available
        
        # Get reasoning effort from environment or use default
        reasoning_effort = os.environ.get("REASONING_EFFORT", "medium")
        
        # Call the API
        response = openai_api_call(
            prompt=prompt,
            model=self.openai_model,
            max_tokens=max_tokens,
            temperature=0.7,
            system_message=system_message,
            reasoning_effort=reasoning_effort
        )
        
        return response
    except Exception as e:
        self.logger.error(f"Error calling OpenAI API: {e}")
        raise
```

## Environment Configuration

The OpenAI Journey Mapper can be configured through environment variables:

```
# Basic configuration
OPENAI_API_KEY=your_api_key_here  # Required for o3/GPT-4o access
OPENAI_JOURNEY_MAPPER_PORT=8090   # Port for the service

# Model configuration
OPENAI_MODEL=o3                   # Model to use (o3 or gpt-4o)
REASONING_EFFORT=medium           # Reasoning effort (low, medium, high)
```

## Docker Configuration

The Docker configuration for the OpenAI Journey Mapper is in `docker-compose-all.yml`:

```yaml
openai-journey-mapper:
  image: python:3.10-slim
  ports:
    - "${OPENAI_JOURNEY_MAPPER_PORT:-8090}:8000"
  environment:
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    - PORT=8000
    - OPENAI_MODEL=o3
    - REASONING_EFFORT=medium
  volumes:
    - ./internal-solutions-openai-journey-mapper:/app
    - ./internal-solutions-openai-journey-mapper/uploads:/app/uploads
  working_dir: /app
  command: bash -c "pip install -r requirements.txt && python run.py"
  networks:
    - nxt-humans-network
  depends_on:
    - launchpad
```

## MCP Service Wrapper

The OpenAI Journey Mapper MCP service wrapper is in `mcp-services/openai-journey-mcp/app.py`:

```python
@app.post("/create")
async def create_journey_map(
    data: Dict[str, Any] = Body(...),
    title: str = Form("Customer Journey"),
    description: str = Form("A visualization of the customer journey"),
    journey_type: str = Form("general")
):
    """Create a journey map using the OpenAI o3 reasoning model."""
    try:
        # Forward request to OpenAI Journey Mapper service
        response = requests.post(
            f"{OPENAI_JOURNEY_MAPPER_URL}/api/journey",
            json={
                "data": data,
                "title": title,
                "description": description,
                "journey_type": journey_type,
                "model": os.environ.get("OPENAI_MODEL", "o3"),
                "reasoning_effort": os.environ.get("REASONING_EFFORT", "medium")
            }
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Error creating journey map: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

## Cost Management

The o3 model has different pricing from standard OpenAI models:

1. **Input Tokens**: Similar pricing to GPT-4o
2. **Output Tokens**: Similar pricing to GPT-4o
3. **Reasoning Tokens**: Additional tokens used for internal reasoning

To manage costs:

1. Use "low" reasoning effort for simpler journey maps
2. Use "medium" reasoning effort for standard journey maps
3. Use "high" reasoning effort only for complex journey maps
4. Monitor token usage in the logs

## Fallback Mechanism

The implementation includes a fallback mechanism to GPT-4o when:

1. The organization is not verified for o3 access
2. The o3 model is temporarily unavailable
3. There are persistent errors with o3

This ensures the journey mapping functionality remains available even if o3 cannot be accessed.

## Performance Considerations

The o3 model may be slower than standard models due to its complex reasoning process:

1. With "low" reasoning effort, performance is similar to GPT-4o
2. With "medium" reasoning effort, responses may take 1.5-2x longer
3. With "high" reasoning effort, responses may take 2-3x longer

Consider this when choosing the reasoning effort level for your application.

## Testing

To test if your organization has access to o3:

```python
from openai import OpenAI

client = OpenAI()
try:
    response = client.responses.create(
        inputs=[{"text": "Hello, how are you?"}],
        model="o3",
        reasoning_effort="low",
        max_tokens=10
    )
    print("Organization has o3 access")
except Exception as e:
    print(f"Error: {e}")
    if "not authorized" in str(e).lower():
        print("Organization does not have o3 access")
```

## Roadmap

Future improvements for the o3 implementation:

1. Add reasoning token tracking and cost estimation
2. Implement adaptive reasoning effort based on complexity
3. Add caching to improve performance for similar requests
4. Support multimodal inputs (images + text) for journey mapping
5. Add direct comparison view between Claude and o3 journey maps