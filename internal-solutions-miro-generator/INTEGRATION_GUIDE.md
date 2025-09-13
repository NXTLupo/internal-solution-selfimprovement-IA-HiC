# Integration Guide: NXT Miro Generator

This guide demonstrates how to integrate the NXT Miro Generator with the Claude Journey Mapper to automatically create interactive Miro boards from generated journey maps.

## 🎯 Overview

The NXT Miro Generator seamlessly converts journey map HTML output from the Claude Journey Mapper into professional, interactive Miro boards with intelligent positioning and color-coded elements.

### Workflow
```
Claude Journey Mapper HTML → NXT Miro Generator → Interactive Miro Board
```

## 🚀 Quick Start Integration

### Step 1: Setup Miro API Access

1. **Get Miro Access Token**
   ```bash
   # Visit: https://miro.com/app/settings/user-profile/apps
   # Create a new app and get your access token
   ```

2. **Configure the Generator**
   ```bash
   cd internal-solutions-miro-generator
   npm install
   npx miro-gen config --init
   ```

3. **Test Connection**
   ```bash
   npx miro-gen test
   ```

### Step 2: Generate Journey Map

1. **Create Journey Map with Claude Mapper**
   ```bash
   cd ../internal-solutions-journeymapper
   python run.py
   # Navigate to http://localhost:8080
   # Generate your journey map
   # Download the HTML file
   ```

2. **Convert to Miro Board**
   ```bash
   cd ../internal-solutions-miro-generator
   npx miro-gen generate -i "../internal-solutions-journeymapper/journey_maps/customer-journey.html"
   ```

## 📋 Detailed Integration Steps

### 1. Journey Mapper Output

The Claude Journey Mapper generates HTML files with structured customer journey data. The Miro Generator parses this HTML to extract:

- **Journey Phases** (Awareness, Consideration, Purchase, etc.)
- **Touchpoints** (Digital, Physical, Human interactions)
- **Pain Points** (Categorized by severity and type)
- **Emotions** (Positive/Negative with intensity ratings)
- **Customer Quotes** (With sentiment analysis)
- **Actions** (Customer behaviors and tasks)
- **Channels** (Communication/interaction mediums)

### 2. Automated Conversion Process

```bash
# Basic conversion
npx miro-gen generate -i journey-map.html

# Advanced options
npx miro-gen generate \
  -i journey-map.html \
  -o ./output \
  --template professional \
  --board-id uXjVKMGpY3k= \
  --verbose
```

### 3. Board Structure

The generated Miro board includes:

- **Title Section** - Journey map title and overview
- **Phase Columns** - Organized by customer journey phases  
- **Element Types** - Color-coded by category:
  - 🔵 Touchpoints (Different shapes for Digital/Physical/Human)
  - 🔴 Pain Points (Color intensity by severity)
  - 😊/😟 Emotions (Shapes and colors by sentiment)
  - 💬 Customer Quotes (Formatted with attribution)
  - ➡️ Actions (Arrow shapes indicating flow)
  - 📱 Channels (Icons for digital/physical channels)
- **Connectors** - Flow lines between phases
- **Legend** - Visual guide for element types

## 🔧 Configuration Options

### Template Configuration

Create custom templates for different use cases:

```bash
# List available templates
npx miro-gen template --list

# Create custom template
npx miro-gen template --create "executive-summary"
```

### Layout Customization

Modify `config/default.json`:

```json
{
  "layout": {
    "grid": {
      "cellWidth": 200,
      "cellHeight": 150,
      "marginX": 50,
      "marginY": 50
    },
    "spacing": {
      "element": 20,
      "group": 40,
      "phase": 60
    }
  },
  "styling": {
    "colorScheme": {
      "primary": "#1A73E8",
      "painPoint": "#FFEBEE",
      "positiveEmotion": "#E8F5E8",
      "negativeEmotion": "#FFF3E0"
    }
  }
}
```

## 🐳 Docker Integration

### Standalone Docker Usage

```bash
# Build the container
docker build -t nxt-miro-generator .

# Run with volume mapping
docker run -v $(pwd)/input:/app/input \
           -v $(pwd)/output:/app/output \
           -e MIRO_ACCESS_TOKEN="your-token" \
           nxt-miro-generator \
           generate -i /app/input/journey.html -o /app/output
```

### Docker Compose Integration

Add to your `docker-compose.yml`:

```yaml
version: '3.8'
services:
  journey-mapper:
    build: ./internal-solutions-journeymapper
    ports:
      - "8080:8000"
    volumes:
      - journey_maps:/app/journey_maps

  miro-generator:
    build: ./internal-solutions-miro-generator
    depends_on:
      - journey-mapper
    volumes:
      - journey_maps:/app/input
      - miro_output:/app/output
    environment:
      - MIRO_ACCESS_TOKEN=${MIRO_ACCESS_TOKEN}
    command: ["watch", "/app/input"]

volumes:
  journey_maps:
  miro_output:
```

## 🔄 Automated Workflow Integration

### Workflow Automation Script

Create `scripts/automated-journey-to-miro.sh`:

```bash
#!/bin/bash

# Automated Journey Map to Miro Board Pipeline
set -e

JOURNEY_DIR="./internal-solutions-journeymapper/journey_maps"
MIRO_DIR="./internal-solutions-miro-generator"
OUTPUT_DIR="./miro-boards"

echo "🚀 Starting automated journey map to Miro conversion..."

# Check for new journey maps
for journey_file in "${JOURNEY_DIR}"/*.html; do
    if [ -f "$journey_file" ]; then
        filename=$(basename "$journey_file")
        echo "📄 Processing: $filename"
        
        # Generate Miro board
        cd "$MIRO_DIR"
        npx miro-gen generate \
            -i "$journey_file" \
            -o "${OUTPUT_DIR}/${filename%.*}" \
            --template professional \
            --verbose
        
        echo "✅ Generated Miro board for: $filename"
    fi
done

echo "🎉 Automation complete!"
```

### File Watcher Integration

```bash
# Install file watcher
npm install -g nodemon

# Watch for journey map changes
nodemon --watch ../internal-solutions-journeymapper/journey_maps \
        --ext html \
        --exec "npx miro-gen generate -i '$NODEMON_FILE'"
```

## 📊 API Integration

### Programmatic Usage

```typescript
import { JourneyMapParser, MiroAPIClient, BoardGenerator, GridLayout } from 'nxt-miro-generator';

async function generateMiroBoard(htmlPath: string, miroToken: string): Promise<string> {
  // Parse journey map
  const parser = new JourneyMapParser(config.parsing);
  const journeyMap = await parser.parseFromFile(htmlPath);
  
  // Generate layout
  const layout = new GridLayout(config.layout);
  const layoutResult = layout.generateLayout(journeyMap);
  
  // Create Miro board
  const miroClient = new MiroAPIClient({ accessToken: miroToken });
  const board = await miroClient.createBoard(journeyMap.title);
  
  // Generate board content
  const generator = new BoardGenerator(miroClient, config);
  const result = await generator.generateBoard(journeyMap, layoutResult, board.id);
  
  return result.boardUrl;
}
```

### Webhook Integration

```javascript
// Express.js webhook endpoint
app.post('/journey-completed', async (req, res) => {
  const { journeyMapId, htmlContent } = req.body;
  
  try {
    // Save HTML to file
    const htmlPath = `/tmp/journey-${journeyMapId}.html`;
    await fs.writeFile(htmlPath, htmlContent);
    
    // Generate Miro board
    const boardUrl = await generateMiroBoard(htmlPath, process.env.MIRO_TOKEN);
    
    res.json({ success: true, boardUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🎨 Customization Examples

### Custom Element Styling

```json
{
  "styling": {
    "colorScheme": {
      "primary": "#6C5CE7",
      "secondary": "#A29BFE", 
      "painPoint": "#FD79A8",
      "positiveEmotion": "#00CEC9",
      "negativeEmotion": "#E84393"
    },
    "fonts": {
      "primary": "Inter",
      "secondary": "Roboto"
    }
  }
}
```

### Custom Element Selectors

```json
{
  "parsing": {
    "customSelectors": {
      "touchpoints": ".interaction-point",
      "painPoints": ".friction-area",
      "emotions": ".customer-feeling",
      "quotes": ".customer-voice"
    }
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **HTML Parsing Errors**
   ```bash
   # Validate HTML structure
   npx miro-gen validate -i journey-map.html --verbose
   ```

2. **Miro API Connection Issues**
   ```bash
   # Test API connection
   npx miro-gen test --verbose
   ```

3. **Layout Problems**
   ```bash
   # Preview layout without creating board
   npx miro-gen generate -i journey-map.html --dry-run
   ```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=miro-generator:*
npx miro-gen generate -i journey-map.html --verbose
```

### Log Analysis

```bash
# View detailed logs
tail -f logs/miro-generator.log

# Search for errors
grep "ERROR" logs/miro-generator.log
```

## 📈 Best Practices

### 1. Journey Map Quality
- Use semantic HTML structure in journey mapper
- Include proper data attributes for element categorization
- Maintain consistent naming conventions

### 2. Miro Board Organization
- Use descriptive board names
- Organize related boards in folders
- Set appropriate sharing permissions

### 3. Automation
- Set up CI/CD pipelines for automatic board generation
- Use webhooks for real-time conversion
- Implement error handling and retry logic

### 4. Performance
- Batch process multiple journey maps
- Use Miro API rate limiting appropriately
- Cache frequently used templates

## 🚀 Advanced Integration

### Multi-Environment Setup

```bash
# Development
MIRO_ACCESS_TOKEN=dev-token npx miro-gen generate -i journey.html

# Staging  
MIRO_ACCESS_TOKEN=staging-token npx miro-gen generate -i journey.html

# Production
MIRO_ACCESS_TOKEN=prod-token npx miro-gen generate -i journey.html
```

### Batch Processing

```bash
# Process multiple journey maps
for file in journey_maps/*.html; do
  npx miro-gen generate -i "$file" --template batch-processing
done
```

### Integration Testing

```bash
# Run integration tests
npm test -- --testPathPattern=integration

# Manual integration test
npm run test:integration:manual
```

## 📞 Support

For integration support:

1. **Check Logs** - Review generator logs for detailed error information
2. **Validate HTML** - Ensure journey mapper HTML follows expected structure
3. **Test API** - Verify Miro API connectivity and permissions
4. **Documentation** - Reference API documentation for advanced usage

## 🎯 Example Workflows

### Workflow 1: Direct Integration
```
Journey Mapper → HTML Export → Miro Generator → Miro Board
```

### Workflow 2: Automated Pipeline
```
Journey Mapper → File Watcher → Auto-Generation → Team Notification
```

### Workflow 3: API Integration
```
External System → Webhook → Journey Processing → Miro Board Creation
```

This integration guide provides everything needed to seamlessly connect the Claude Journey Mapper with the NXT Miro Generator for automated, professional board creation.