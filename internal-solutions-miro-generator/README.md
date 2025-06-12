# NXT Miro Generator

A TypeScript CLI application that generates interactive Miro boards from Claude journey mapper HTML output. This tool parses journey map HTML files and creates structured, visually appealing Miro boards with proper spatial positioning and element styling.

## Features

### Core Functionality
- **HTML Parsing**: Extract journey components from Claude journey mapper HTML
- **Miro Integration**: Create boards using Miro REST API v2
- **Grid Layout Engine**: Intelligent spatial positioning of elements
- **Element Detection**: Automatically identify touchpoints, pain points, emotions, quotes, actions, and channels
- **Batch Operations**: Efficient bulk creation with rate limiting
- **Template System**: Customizable styling and layout templates

### CLI Interface
- Multiple commands: `generate`, `validate`, `config`, `template`, `test`
- Interactive configuration setup
- Dry-run mode for previewing changes
- Verbose logging and error handling
- Progress indicators and status updates

### Docker Support
- Multi-stage build for optimal image size
- Security-focused with non-root user
- Health checks and proper signal handling
- Environment variable configuration

## Installation

### Prerequisites
- Node.js 18+ 
- Miro account with API access
- Valid Miro access token

### Local Installation

```bash
# Clone or copy the project
cd internal-solutions-miro-generator

# Install dependencies
npm install

# Build the project
npm run build

# Create environment file
cp .env.example .env

# Edit .env with your Miro access token
vim .env
```

### Docker Installation

```bash
# Build Docker image
npm run docker:build

# Run with environment file
docker run --env-file .env nxt-miro-generator --help
```

## Quick Start

### 1. Configure Miro Access

```bash
# Interactive configuration
npx miro-gen config --init

# Or set manually
npx miro-gen config --set-token YOUR_MIRO_ACCESS_TOKEN
```

### 2. Validate Journey Map

```bash
# Validate HTML file
npx miro-gen validate -i examples/sample-journey-map.html -v
```

### 3. Generate Miro Board

```bash
# Generate from HTML file
npx miro-gen generate -i examples/sample-journey-map.html -o ./output

# Generate with specific board ID
npx miro-gen generate -i journey.html -b uXjVMxxxx -v

# Dry run to preview
npx miro-gen generate -i journey.html --dry-run
```

## CLI Commands

### Generate Command
```bash
npx miro-gen generate [options]

Options:
  -i, --input <file>      Input HTML file path (required)
  -o, --output <dir>      Output directory (default: ./output)
  -b, --board-id <id>     Miro board ID (creates new if not provided)
  -t, --template <name>   Template name (default: default)
  -c, --config <file>     Custom configuration file
  --dry-run               Preview without creating board
  -v, --verbose           Enable verbose logging
  -f, --force             Force overwrite existing files
```

### Validate Command
```bash
npx miro-gen validate -i <file> [options]

Options:
  -i, --input <file>      Input HTML file path (required)
  -v, --verbose           Enable verbose logging
```

### Config Command
```bash
npx miro-gen config [options]

Options:
  --init                  Initialize configuration interactively
  --set-token <token>     Set Miro access token
  --set-board <id>        Set default board ID
  --show                  Show current configuration
```

### Template Command
```bash
npx miro-gen template [options]

Options:
  --list                  List available templates
  --create <name>         Create new template
  --delete <name>         Delete template
```

### Test Command
```bash
npx miro-gen test [options]

Options:
  -v, --verbose           Enable verbose logging
```

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Required
MIRO_ACCESS_TOKEN=your_access_token_here

# Optional
MIRO_BOARD_ID=your_default_board_id
API_TIMEOUT=30000
LOG_LEVEL=info
GRID_CELL_WIDTH=200
GRID_CELL_HEIGHT=150
BATCH_SIZE=10
```

### Custom Configuration File

Create `config/custom.json`:

```json
{
  "miro": {
    "timeout": 45000,
    "retryAttempts": 5
  },
  "styling": {
    "colorScheme": {
      "primary": "#FF6B35",
      "painPoint": "#E53E3E"
    }
  },
  "layout": {
    "spacing": {
      "phase": 120,
      "element": 25
    }
  }
}
```

Use with: `npx miro-gen generate -i file.html -c config/custom.json`

## HTML Structure Requirements

The tool expects HTML with semantic structure for journey map elements:

### Basic Structure
```html
<!DOCTYPE html>
<html>
<head>
    <title>Journey Map Title</title>
    <meta name="persona" content="Customer Name">
    <meta name="scenario" content="Scenario Description">
</head>
<body>
    <h1>Journey Map Title</h1>
    
    <div class="phase" data-phase="awareness">
        <h2>Phase Name</h2>
        <p class="description">Phase description</p>
        
        <!-- Elements -->
    </div>
</body>
</html>
```

### Supported Elements

#### Touchpoints
```html
<div class="touchpoint" data-type="digital">
    <strong>Touchpoint Name</strong>
    <p>Description</p>
</div>
```

#### Pain Points
```html
<div class="pain-point" data-severity="high" data-category="process">
    <h4>Pain Point Title</h4>
    <p>Description of the problem</p>
</div>
```

#### Emotions
```html
<div class="emotion positive" data-intensity="7">
    <p>Happy and satisfied with the experience</p>
</div>
```

#### Quotes
```html
<div class="quote" data-sentiment="negative">
    <p>"This is frustrating to use!"</p>
    <cite>- Customer Name</cite>
</div>
```

#### Actions
```html
<div class="action" data-type="search">
    <p>Search for product information</p>
</div>
```

#### Channels
```html
<div class="channel" data-type="website">
    <p>Company Website</p>
</div>
```

## API Integration

### Miro API Setup

1. **Create Miro Developer App**:
   - Go to https://developers.miro.com/
   - Create new app
   - Get access token

2. **Set Permissions**:
   - `boards:read` - Read board information
   - `boards:write` - Create and modify boards

3. **Board Access**:
   - Ensure your app has access to target boards
   - Use board ID or create new boards

### Rate Limiting

The tool implements automatic rate limiting:
- Maximum 5 concurrent requests
- Automatic retry with exponential backoff
- Batch processing for large datasets
- Configurable rate limits

## Templates

### Available Templates

- **default**: Standard colors and layout
- **minimal**: Reduced visual elements
- **colorful**: Vibrant color scheme

### Creating Custom Templates

```bash
# Create new template
npx miro-gen template --create my-template

# Edit template file
vim config/templates/my-template.json
```

Template structure:
```json
{
  "name": "My Template",
  "description": "Custom template description",
  "styling": {
    "colorScheme": {
      "primary": "#1A73E8",
      "painPoint": "#EA4335"
    },
    "fonts": {
      "primary": "Arial"
    }
  }
}
```

## Development

### Build and Test

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode
npm run watch

# Lint code
npm run lint
```

### Development Scripts

```bash
# Development with ts-node
npm run dev -- generate -i examples/sample.html

# Clean build artifacts
npm run clean

# Build Docker image
npm run docker:build
```

### Project Structure

```
src/
├── cli/           # CLI interface and commands
├── parsers/       # HTML parsing logic
├── miro/          # Miro API client and board generation
├── utils/         # Utilities (logger, config, layout)
└── types/         # TypeScript type definitions

tests/
├── unit/          # Unit tests
└── integration/   # Integration tests

config/            # Configuration files and templates
examples/          # Sample journey maps
docs/              # Additional documentation
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```bash
   # Test API connection
   npx miro-gen test -v
   
   # Verify token
   npx miro-gen config --show
   ```

2. **Parsing Failed**
   ```bash
   # Validate HTML structure
   npx miro-gen validate -i your-file.html -v
   
   # Check HTML format
   # Ensure proper semantic structure
   ```

3. **Board Creation Failed**
   ```bash
   # Check board permissions
   # Verify board ID exists
   # Try creating new board
   npx miro-gen generate -i file.html --dry-run
   ```

4. **Rate Limiting**
   ```bash
   # Reduce batch size
   BATCH_SIZE=5 npx miro-gen generate -i file.html
   
   # Increase timeout
   API_TIMEOUT=60000 npx miro-gen generate -i file.html
   ```

### Debug Mode

Enable verbose logging:
```bash
LOG_LEVEL=debug npx miro-gen generate -i file.html -v
```

### Support

For issues and questions:
1. Check the troubleshooting section
2. Review example files in `examples/`
3. Check configuration in `config/default.json`
4. Enable verbose logging for detailed error messages

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

### Development Guidelines

- Use TypeScript strict mode
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Include unit tests for new features
- Update documentation for changes