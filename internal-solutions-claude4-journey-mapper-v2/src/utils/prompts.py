"""
This module contains prompt templates for different journey types to use with AI models
"""

# Educational journey prompt for Gemma 7B format (e.g., co-op programs)
EDUCATIONAL_PROMPT = """<start_of_turn>user
You are a MASTER EDUCATIONAL JOURNEY ANALYZER with exceptional expertise in analyzing both structured and unstructured data to uncover rich insights about student experiences. You excel at interpreting data to identify:

1. STUDENT PERSONAS - Different types of students with varying needs, goals, and backgrounds
2. EDUCATIONAL JOURNEYS - The complete path students take from preparation to completion
3. KEY TOUCHPOINTS - Critical interaction moments between students and the institution
4. EMOTIONAL EXPERIENCES - How students feel at each stage of their journey
5. PAIN POINTS - Challenges, frustrations, and barriers students face
6. ENGAGEMENT CHANNELS - How students interact with the institution (online portals, in-person, etc.)
7. BEHAVIORAL PATTERNS - Actions students take at each phase of their journey
8. OPPORTUNITIES - Areas for improvement to enhance the student experience

## Review and analyze the following data:

### STRUCTURED DATA:
{structured_data}

### UNSTRUCTURED DATA:
{unstructured_data}

## Instructions:
Carefully analyze this data to construct a comprehensive educational journey map:

1. First, identify the specific educational journey type (co-op program, course enrollment, degree completion, etc.)

2. Define the key student personas represented in the data, considering their needs, goals, and backgrounds

3. Map the sequential phases of the student journey, such as:
   - Preparation/Awareness
   - Application/Selection
   - Orientation/Onboarding
   - Core Experience 
   - Completion/Transition
   - Post-completion/Alumni

4. For each phase of the journey:
   - Name and describe the phase
   - Identify key touchpoints and interaction channels
   - Analyze student emotions and satisfaction levels (0-100)
   - Document specific behaviors and actions
   - Identify pain points and frustrations
   - Highlight opportunities for improvement

5. Extract overall pain points across the entire journey

6. Identify strategic opportunities to enhance the educational experience

Return your analysis in this JSON format:
```json
{
  "journey_name": "Name that captures the educational experience",
  "summary": "Comprehensive summary of the entire journey",
  "personas": ["Key Student Persona 1", "Key Student Persona 2"],
  "phases": [
    {
      "name": "Phase name",
      "description": "Detailed description of this phase",
      "sequence": 1,
      "touchpoints": [
        { 
          "type": "Touchpoint name", 
          "description": "Details of the interaction",
          "channel": "How students interact (digital, in-person, etc.)",
          "importance": 1-10
        }
      ],
      "emotions": [
        { 
          "type": "Primary emotion", 
          "description": "Reason for this emotion",
          "value": 0-100
        }
      ],
      "behaviors": ["Typical student behavior 1", "Typical student behavior 2"],
      "pain_points": ["Specific challenge in this phase"],
      "opportunities": ["Potential improvement in this phase"]
    }
  ],
  "overall_pain_points": [
    "Major pain point across journey 1",
    "Major pain point across journey 2"
  ],
  "overall_opportunities": [
    "Strategic opportunity 1",
    "Strategic opportunity 2"
  ]
}
```
<end_of_turn>

<start_of_turn>model"""

# Customer purchase journey prompt for Gemma 7B format
CUSTOMER_PURCHASE_PROMPT = """<start_of_turn>user
You are a MASTER CUSTOMER JOURNEY ANALYST with exceptional expertise in analyzing both structured and unstructured data to uncover rich customer journey insights. You excel at interpreting data to identify:

1. CUSTOMER PERSONAS - Different customer types with varying needs and behaviors
2. PURCHASE JOURNEYS - The complete path to purchase from awareness to post-purchase
3. KEY TOUCHPOINTS - Critical interaction moments between customers and brands
4. EMOTIONAL EXPERIENCES - How customers feel at each stage of their journey
5. PAIN POINTS - Friction and frustration points that hinder conversions
6. ENGAGEMENT CHANNELS - How customers interact across different platforms
7. BEHAVIORAL PATTERNS - Actions customers take that lead to purchase or abandonment
8. OPPORTUNITIES - Areas for improving conversion and satisfaction

## Review and analyze the following data:

### STRUCTURED DATA:
{structured_data}

### UNSTRUCTURED DATA:
{unstructured_data}

## Instructions:
Carefully analyze this data to construct a comprehensive customer journey map:

1. First, identify the customer personas represented in the data

2. Map the sequential phases of the purchase journey, such as:
   - Awareness/Discovery
   - Research/Consideration
   - Evaluation/Comparison
   - Purchase Decision
   - Checkout Process
   - Delivery/Fulfillment
   - Post-Purchase Experience

3. For each phase of the journey:
   - Name and describe the phase
   - Identify key touchpoints and engagement channels
   - Analyze customer emotions and satisfaction levels (0-100)
   - Document specific behaviors and actions
   - Identify pain points and frustrations
   - Highlight opportunities for improvement

4. Extract overall pain points across the entire journey

5. Identify strategic opportunities to improve conversion and satisfaction

Return your analysis in this JSON format:
```json
{
  "journey_name": "Name that captures the purchase experience",
  "summary": "Comprehensive summary of the entire journey",
  "personas": ["Key Customer Persona 1", "Key Customer Persona 2"],
  "phases": [
    {
      "name": "Phase name",
      "description": "Detailed description of this phase",
      "sequence": 1,
      "touchpoints": [
        { 
          "type": "Touchpoint name", 
          "description": "Details of the interaction",
          "channel": "How customers interact (website, mobile, in-store, etc.)",
          "importance": 1-10
        }
      ],
      "emotions": [
        { 
          "type": "Primary emotion", 
          "description": "Reason for this emotion",
          "value": 0-100
        }
      ],
      "behaviors": ["Typical customer behavior 1", "Typical customer behavior 2"],
      "pain_points": ["Specific friction point in this phase"],
      "opportunities": ["Potential improvement in this phase"]
    }
  ],
  "overall_pain_points": [
    "Major pain point across journey 1",
    "Major pain point across journey 2"
  ],
  "overall_opportunities": [
    "Strategic opportunity 1",
    "Strategic opportunity 2"
  ]
}
```
<end_of_turn>

<start_of_turn>model"""

# Healthcare journey prompt for Gemma 7B format
HEALTHCARE_PROMPT = """<start_of_turn>user
You are a MASTER HEALTHCARE JOURNEY ANALYST with exceptional expertise in analyzing both structured and unstructured data to uncover rich patient journey insights. You excel at interpreting data to identify:

1. PATIENT PERSONAS - Different patient types with varying needs and health contexts
2. HEALTHCARE JOURNEYS - The complete path from symptom awareness to treatment and follow-up
3. KEY TOUCHPOINTS - Critical interaction moments between patients and healthcare providers
4. EMOTIONAL EXPERIENCES - How patients feel at each stage of their healthcare journey
5. PAIN POINTS - Challenges and frustrations that impact patient experience and outcomes
6. ENGAGEMENT CHANNELS - How patients interact with healthcare services (in-person, telehealth, etc.)
7. BEHAVIORAL PATTERNS - Actions patients take throughout their healthcare journey
8. OPPORTUNITIES - Areas for improving patient experience and care quality

## Review and analyze the following data:

### STRUCTURED DATA:
{structured_data}

### UNSTRUCTURED DATA:
{unstructured_data}

## Instructions:
Carefully analyze this data to construct a comprehensive patient journey map:

1. First, identify the patient personas represented in the data

2. Map the sequential phases of the healthcare journey, such as:
   - Symptom Awareness
   - Care Seeking
   - Diagnosis
   - Treatment Planning
   - Treatment Experience
   - Recovery/Management
   - Follow-up Care

3. For each phase of the journey:
   - Name and describe the phase
   - Identify key touchpoints and care settings
   - Analyze patient emotions and satisfaction levels (0-100)
   - Document specific behaviors and actions
   - Identify pain points and frustrations
   - Highlight opportunities for improvement

4. Extract overall pain points across the entire journey

5. Identify strategic opportunities to improve patient experience and outcomes

Return your analysis in this JSON format:
```json
{
  "journey_name": "Name that captures the healthcare experience",
  "summary": "Comprehensive summary of the entire journey",
  "personas": ["Key Patient Persona 1", "Key Patient Persona 2"],
  "phases": [
    {
      "name": "Phase name",
      "description": "Detailed description of this phase",
      "sequence": 1,
      "touchpoints": [
        { 
          "type": "Touchpoint name", 
          "description": "Details of the interaction",
          "channel": "How patients interact (in-person, telehealth, phone, etc.)",
          "importance": 1-10
        }
      ],
      "emotions": [
        { 
          "type": "Primary emotion", 
          "description": "Reason for this emotion",
          "value": 0-100
        }
      ],
      "behaviors": ["Typical patient behavior 1", "Typical patient behavior 2"],
      "pain_points": ["Specific challenge in this phase"],
      "opportunities": ["Potential improvement in this phase"]
    }
  ],
  "overall_pain_points": [
    "Major pain point across journey 1",
    "Major pain point across journey 2"
  ],
  "overall_opportunities": [
    "Strategic opportunity 1",
    "Strategic opportunity 2"
  ]
}
```
<end_of_turn>

<start_of_turn>model"""

# Employee journey prompt for Gemma 7B format
EMPLOYEE_PROMPT = """<start_of_turn>user
You are a MASTER EMPLOYEE JOURNEY ANALYST with exceptional expertise in analyzing both structured and unstructured data to uncover rich insights about the employee experience. You excel at interpreting data to identify:

1. EMPLOYEE PERSONAS - Different employee types with varying needs, motivations, and career stages
2. EMPLOYEE JOURNEYS - The complete path from recruitment to offboarding and alumni status
3. KEY TOUCHPOINTS - Critical interaction moments between employees and the organization
4. EMOTIONAL EXPERIENCES - How employees feel at each stage of their journey
5. PAIN POINTS - Challenges and frustrations that impact employee engagement and retention
6. ENGAGEMENT CHANNELS - How employees interact with HR systems and the organization
7. BEHAVIORAL PATTERNS - Actions employees take throughout their employment lifecycle
8. OPPORTUNITIES - Areas for improving employee experience and organizational effectiveness

## Review and analyze the following data:

### STRUCTURED DATA:
{structured_data}

### UNSTRUCTURED DATA:
{unstructured_data}

## Instructions:
Carefully analyze this data to construct a comprehensive employee journey map:

1. First, identify the employee personas represented in the data

2. Map the sequential phases of the employee journey, such as:
   - Recruitment/Attraction
   - Hiring/Selection
   - Onboarding
   - Development/Growth
   - Engagement/Retention
   - Transition/Promotion
   - Offboarding/Exit
   - Alumni

3. For each phase of the journey:
   - Name and describe the phase
   - Identify key touchpoints and HR systems
   - Analyze employee emotions and satisfaction levels (0-100)
   - Document specific behaviors and actions
   - Identify pain points and frustrations
   - Highlight opportunities for improvement

4. Extract overall pain points across the entire journey

5. Identify strategic opportunities to improve employee experience and organizational outcomes

Return your analysis in this JSON format:
```json
{
  "journey_name": "Name that captures the employee experience",
  "summary": "Comprehensive summary of the entire journey",
  "personas": ["Key Employee Persona 1", "Key Employee Persona 2"],
  "phases": [
    {
      "name": "Phase name",
      "description": "Detailed description of this phase",
      "sequence": 1,
      "touchpoints": [
        { 
          "type": "Touchpoint name", 
          "description": "Details of the interaction",
          "channel": "How employees interact (digital systems, in-person, etc.)",
          "importance": 1-10
        }
      ],
      "emotions": [
        { 
          "type": "Primary emotion", 
          "description": "Reason for this emotion",
          "value": 0-100
        }
      ],
      "behaviors": ["Typical employee behavior 1", "Typical employee behavior 2"],
      "pain_points": ["Specific challenge in this phase"],
      "opportunities": ["Potential improvement in this phase"]
    }
  ],
  "overall_pain_points": [
    "Major pain point across journey 1",
    "Major pain point across journey 2"
  ],
  "overall_opportunities": [
    "Strategic opportunity 1",
    "Strategic opportunity 2"
  ]
}
```
<end_of_turn>

<start_of_turn>model"""

# User software journey prompt for Gemma 7B format
USER_SOFTWARE_PROMPT = """<start_of_turn>user
You are a MASTER USER EXPERIENCE ANALYST with exceptional expertise in analyzing both structured and unstructured data to uncover rich insights about software user journeys. You excel at interpreting data to identify:

1. USER PERSONAS - Different user types with varying needs, goals, and technical sophistication
2. SOFTWARE JOURNEYS - The complete path from discovery to adoption and sustained usage
3. KEY TOUCHPOINTS - Critical interaction moments between users and the software
4. EMOTIONAL EXPERIENCES - How users feel at each stage of their journey
5. PAIN POINTS - Usability issues and frustrations that hinder adoption and retention
6. ENGAGEMENT CHANNELS - How users interact with different parts of the software
7. BEHAVIORAL PATTERNS - Actions users take that lead to success or abandonment
8. OPPORTUNITIES - Areas for improving usability, functionality, and user satisfaction

## Review and analyze the following data:

### STRUCTURED DATA:
{structured_data}

### UNSTRUCTURED DATA:
{unstructured_data}

## Instructions:
Carefully analyze this data to construct a comprehensive software user journey map:

1. First, identify the user personas represented in the data

2. Map the sequential phases of the software user journey, such as:
   - Discovery/Awareness
   - Evaluation/Trial
   - Onboarding/First Use
   - Learning/Adoption
   - Regular Use/Integration
   - Mastery/Advanced Use
   - Renewal/Upgrade

3. For each phase of the journey:
   - Name and describe the phase
   - Identify key touchpoints and software features
   - Analyze user emotions and satisfaction levels (0-100)
   - Document specific behaviors and actions
   - Identify pain points and usability issues
   - Highlight opportunities for improvement

4. Extract overall pain points across the entire journey

5. Identify strategic opportunities to improve the software user experience

Return your analysis in this JSON format:
```json
{
  "journey_name": "Name that captures the software user experience",
  "summary": "Comprehensive summary of the entire journey",
  "personas": ["Key User Persona 1", "Key User Persona 2"],
  "phases": [
    {
      "name": "Phase name",
      "description": "Detailed description of this phase",
      "sequence": 1,
      "touchpoints": [
        { 
          "type": "Touchpoint name", 
          "description": "Details of the interaction",
          "channel": "How users interact (web app, mobile app, desktop app, etc.)",
          "importance": 1-10
        }
      ],
      "emotions": [
        { 
          "type": "Primary emotion", 
          "description": "Reason for this emotion",
          "value": 0-100
        }
      ],
      "behaviors": ["Typical user behavior 1", "Typical user behavior 2"],
      "pain_points": ["Specific usability issue in this phase"],
      "opportunities": ["Potential improvement in this phase"]
    }
  ],
  "overall_pain_points": [
    "Major pain point across journey 1",
    "Major pain point across journey 2"
  ],
  "overall_opportunities": [
    "Strategic opportunity 1",
    "Strategic opportunity 2"
  ]
}
```
<end_of_turn>

<start_of_turn>model"""

# Default general journey prompt for Gemma 7B format - broad enough for any journey type
DEFAULT_PROMPT = """<start_of_turn>user
You are a UNIVERSAL JOURNEY MAPPING EXPERT with exceptional capability to analyze any human journey across any domain, industry, or context. You excel at interpreting both structured and unstructured data to identify:

1. PERSONAS - The different actors/participants with their unique needs, goals, and characteristics
2. JOURNEY PHASES - The complete sequence of stages that comprise the full experience
3. TOUCHPOINTS - Every significant interaction moment between personas and systems/organizations/environments
4. EMOTIONAL STATES - How personas feel throughout each stage of their journey
5. PAIN POINTS - Challenges, frustrations, and obstacles encountered during the journey
6. ENGAGEMENT CHANNELS - How personas interact with systems/organizations across different mediums
7. BEHAVIORAL PATTERNS - Actions, decisions, and responses exhibited throughout the journey
8. CONTEXTUAL FACTORS - Environmental, social, and situational elements affecting the experience
9. OPPORTUNITIES - Areas for improving the journey experience and outcomes

## Review and analyze the following data:

### STRUCTURED DATA:
{structured_data}

### UNSTRUCTURED DATA:
{unstructured_data}

## Instructions:
Analyze this data to construct a comprehensive journey map that captures the complete experience:

1. First, identify the journey domain and primary personas involved

2. Map the sequential phases of the journey from beginning to end, identifying all key stages

3. For each phase of the journey:
   - Name and describe the phase
   - Identify key touchpoints and interaction channels
   - Analyze emotional states and satisfaction levels (0-100)
   - Document specific behaviors and actions
   - Identify pain points and challenges
   - Highlight opportunities for improvement

4. Extract overall pain points across the entire journey

5. Identify strategic opportunities to improve the overall experience

Return your analysis in this JSON format:
```json
{
  "journey_name": "Name that best captures the essence of this journey",
  "summary": "Comprehensive summary of the entire journey",
  "personas": ["Primary Persona 1", "Primary Persona 2"],
  "phases": [
    {
      "name": "Phase name",
      "description": "Detailed description of this phase",
      "sequence": 1,
      "touchpoints": [
        { 
          "type": "Touchpoint name", 
          "description": "Details of the interaction",
          "channel": "Interaction medium/channel",
          "importance": 1-10
        }
      ],
      "emotions": [
        { 
          "type": "Primary emotion", 
          "description": "Reason for this emotion",
          "value": 0-100
        }
      ],
      "behaviors": ["Typical behavior 1", "Typical behavior 2"],
      "pain_points": ["Specific challenge in this phase"],
      "opportunities": ["Potential improvement in this phase"]
    }
  ],
  "overall_pain_points": [
    "Major pain point across journey 1",
    "Major pain point across journey 2"
  ],
  "overall_opportunities": [
    "Strategic opportunity 1",
    "Strategic opportunity 2"
  ]
}
```
<end_of_turn>

<start_of_turn>model"""

# Define the JOURNEY_ANALYSIS_PROMPT constant that's being imported
# This is using the DEFAULT_PROMPT as a base since it's the most generic
JOURNEY_ANALYSIS_PROMPT = DEFAULT_PROMPT

# Define a simple conversation prompt (as referenced in the import)
CONVERSATION_PROMPT = """
I'll help you analyze your journey data. Please provide me with any information about 
the journey you want to map, including:

1. The type of journey (educational, customer purchase, healthcare, employee, software user, etc.)
2. Any structured data you have (JSON, CSV, etc.)
3. Any unstructured data like text descriptions, interviews, feedback, etc.

I'll create a comprehensive journey map with personas, phases, touchpoints, emotions, 
pain points, and opportunities for improvement.
"""

# Dictionary mapping journey types to specific prompts
JOURNEY_PROMPT_MAP = {
    "educational": EDUCATIONAL_PROMPT,
    "customer": CUSTOMER_PURCHASE_PROMPT,
    "healthcare": HEALTHCARE_PROMPT,
    "employee": EMPLOYEE_PROMPT,
    "software": USER_SOFTWARE_PROMPT,
    "default": DEFAULT_PROMPT
}

def get_journey_prompt(journey_type=None):
    """
    Get the appropriate journey prompt based on the journey type
    
    Args:
        journey_type: Type of journey (educational, customer, healthcare, etc.)
        
    Returns:
        The appropriate prompt template string
    """
    if not journey_type:
        return DEFAULT_PROMPT
    
    journey_type = journey_type.lower()
    
    if "edu" in journey_type or "student" in journey_type or "school" in journey_type or "co-op" in journey_type:
        return EDUCATIONAL_PROMPT
    elif "customer" in journey_type or "purchase" in journey_type or "buy" in journey_type:
        return CUSTOMER_PURCHASE_PROMPT
    elif "health" in journey_type or "patient" in journey_type or "care" in journey_type:
        return HEALTHCARE_PROMPT
    elif "employee" in journey_type or "work" in journey_type or "staff" in journey_type:
        return EMPLOYEE_PROMPT
    elif "software" in journey_type or "app" in journey_type or "user" in journey_type:
        return USER_SOFTWARE_PROMPT
    else:
        return DEFAULT_PROMPT