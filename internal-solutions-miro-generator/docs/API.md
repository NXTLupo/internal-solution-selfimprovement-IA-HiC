# API Documentation

## Programmatic Usage

The NXT Miro Generator can be used as a library in your TypeScript/JavaScript projects.

### Installation

```bash
npm install nxt-miro-generator
```

### Basic Usage

```typescript
import { 
  JourneyMapParser, 
  MiroAPIClient, 
  BoardGenerator,
  ConfigManager,
  GridLayout 
} from 'nxt-miro-generator';

// Initialize components
const configManager = new ConfigManager();
const config = await configManager.loadConfig();

const parser = new JourneyMapParser(config.parsing);
const miroClient = new MiroAPIClient(config.miro);
const gridLayout = new GridLayout(config.layout);
const boardGenerator = new BoardGenerator(miroClient, config);

// Parse journey map
const journeyMap = await parser.parseFromFile('journey-map.html');

// Generate layout
const layout = gridLayout.generateLayout(journeyMap);

// Create Miro board
const result = await boardGenerator.generateBoard(journeyMap, layout, 'board-id');

console.log(`Board created: ${result.boardUrl}`);
```

## API Reference

### JourneyMapParser

Parse HTML journey maps into structured data.

```typescript
class JourneyMapParser {
  constructor(config: ParsingConfig)
  
  async parseFromFile(filePath: string): Promise<JourneyMap>
  async parseFromString(htmlContent: string, source?: string): Promise<JourneyMap>
}
```

#### Example

```typescript
const parser = new JourneyMapParser({
  touchpoints: true,
  painPoints: true,
  quotes: true,
  emotions: true,
  channels: true,
  actions: true
});

const journeyMap = await parser.parseFromFile('journey.html');
console.log(`Found ${journeyMap.phases.length} phases`);
```

### MiroAPIClient

Interface with Miro REST API v2.

```typescript
class MiroAPIClient {
  constructor(config: MiroConfig)
  
  async validateConnection(): Promise<MiroUser>
  async createBoard(name: string, description?: string): Promise<MiroBoard>
  async getBoard(boardId: string): Promise<MiroBoard>
  
  async createShape(boardId: string, data: ShapeData): Promise<MiroShape>
  async createText(boardId: string, data: TextData): Promise<MiroText>
  async createStickyNote(boardId: string, data: StickerData): Promise<MiroSticker>
  async createConnector(boardId: string, data: ConnectorData): Promise<MiroConnector>
  
  async createItemsBatch(boardId: string, items: MiroItemData[]): Promise<MiroItem[]>
  async clearBoard(boardId: string): Promise<void>
  
  getBoardUrl(boardId: string): string
}
```

#### Example

```typescript
const client = new MiroAPIClient({
  accessToken: 'your-token',
  baseUrl: 'https://api.miro.com/v2',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
});

// Test connection
const user = await client.validateConnection();
console.log(`Connected as: ${user.name}`);

// Create board
const board = await client.createBoard('My Journey Map');
console.log(`Board created: ${client.getBoardUrl(board.id)}`);
```

### BoardGenerator

Generate complete Miro boards from journey map data.

```typescript
class BoardGenerator {
  constructor(miroClient: MiroAPIClient, config: AppConfig)
  
  async generateBoard(
    journeyMap: JourneyMap, 
    layoutResult: LayoutResult, 
    boardId: string
  ): Promise<GenerationResult>
}
```

#### Example

```typescript
const generator = new BoardGenerator(miroClient, config);

const result = await generator.generateBoard(journeyMap, layout, boardId);

console.log(`Generated board with ${result.itemsCreated} items`);
console.log(`View at: ${result.boardUrl}`);
```

### GridLayout

Calculate optimal spatial positioning for elements.

```typescript
class GridLayout {
  constructor(config: LayoutOptions)
  
  generateLayout(journeyMap: JourneyMap): LayoutResult
  optimizeLayout(layout: LayoutResult): LayoutResult
  getLayoutStats(layout: LayoutResult): LayoutStats
}
```

#### Example

```typescript
const gridLayout = new GridLayout({
  grid: {
    cellWidth: 200,
    cellHeight: 150,
    marginX: 50,
    marginY: 50,
    columns: 8
  },
  spacing: {
    phase: 100,
    element: 20,
    group: 40
  },
  alignment: 'center',
  distribution: 'grid'
});

const layout = gridLayout.generateLayout(journeyMap);
const optimized = gridLayout.optimizeLayout(layout);
const stats = gridLayout.getLayoutStats(optimized);

console.log(`Layout efficiency: ${stats.efficiency}%`);
```

### ConfigManager

Manage application configuration.

```typescript
class ConfigManager {
  async loadConfig(configPath?: string): Promise<AppConfig>
  getCurrentConfig(): AppConfig
  
  async setMiroToken(token: string): Promise<void>
  async setDefaultBoard(boardId: string): Promise<void>
  
  async listTemplates(): Promise<Template[]>
  async createTemplate(name: string, options: any): Promise<void>
  async deleteTemplate(name: string): Promise<void>
}
```

#### Example

```typescript
const configManager = new ConfigManager();

// Load configuration
const config = await configManager.loadConfig('custom-config.json');

// Update API token
await configManager.setMiroToken('new-token');

// List templates
const templates = await configManager.listTemplates();
console.log(`Available templates: ${templates.map(t => t.name).join(', ')}`);
```

## Type Definitions

### Core Types

```typescript
interface JourneyMap {
  id: string;
  title: string;
  phases: JourneyPhase[];
  metadata: JourneyMetadata;
}

interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  touchpoints: Touchpoint[];
  emotions: Emotion[];
  painPoints: PainPoint[];
  quotes: Quote[];
  actions: Action[];
  channels: Channel[];
}

interface Touchpoint {
  id: string;
  name: string;
  description?: string;
  type: TouchpointType;
  phase: string;
  position: Position;
  metadata?: Record<string, any>;
}

interface PainPoint {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  category: PainPointCategory;
  phase: string;
  position: Position;
  impact?: string;
  solution?: string;
}
```

### Configuration Types

```typescript
interface AppConfig {
  miro: MiroConfig;
  parsing: ParsingConfig;
  layout: LayoutOptions;
  styling: StylingConfig;
  api: ApiConfig;
  performance: PerformanceConfig;
}

interface MiroConfig {
  accessToken: string;
  boardId?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface ParsingConfig {
  touchpoints: boolean;
  painPoints: boolean;
  quotes: boolean;
  emotions: boolean;
  channels: boolean;
  actions: boolean;
  customSelectors?: Record<string, string>;
}
```

### Layout Types

```typescript
interface LayoutResult {
  bounds: LayoutBounds;
  phases: PhaseLayout[];
  totalElements: number;
  gridInfo: GridInfo;
}

interface PhaseLayout {
  phaseId: string;
  phaseName: string;
  bounds: LayoutBounds;
  header: ElementLayout;
  touchpoints: ElementLayout[];
  painPoints: ElementLayout[];
  emotions: ElementLayout[];
  quotes: ElementLayout[];
  actions: ElementLayout[];
  channels: ElementLayout[];
}
```

## Error Handling

The library uses custom error types for better error handling:

```typescript
import { 
  ValidationError, 
  MiroAPIError, 
  ParsingError, 
  ConfigurationError 
} from 'nxt-miro-generator';

try {
  const journeyMap = await parser.parseFromFile('invalid.html');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Details:', error.details);
  } else if (error instanceof MiroAPIError) {
    console.error('Miro API error:', error.message);
    console.error('Status code:', error.statusCode);
  }
}
```

## Advanced Usage

### Custom Element Parsing

```typescript
const customConfig: ParsingConfig = {
  touchpoints: true,
  painPoints: true,
  quotes: false,
  emotions: true,
  channels: true,
  actions: false,
  customSelectors: {
    touchpoints: '.custom-touchpoint, .interaction-point',
    painPoints: '.friction, .problem-area',
    emotions: '.customer-emotion, .feeling'
  }
};

const parser = new JourneyMapParser(customConfig);
```

### Batch Board Generation

```typescript
const journeyMaps = await Promise.all([
  parser.parseFromFile('journey1.html'),
  parser.parseFromFile('journey2.html'),
  parser.parseFromFile('journey3.html')
]);

for (const journeyMap of journeyMaps) {
  const layout = gridLayout.generateLayout(journeyMap);
  const board = await miroClient.createBoard(journeyMap.title);
  const result = await boardGenerator.generateBoard(journeyMap, layout, board.id);
  console.log(`Generated: ${result.boardUrl}`);
}
```

### Custom Styling

```typescript
const customConfig: AppConfig = {
  // ... other config
  styling: {
    colorScheme: {
      primary: '#FF6B35',
      secondary: '#004E89',
      painPoint: '#E53E3E',
      positiveEmotion: '#38A169',
      negativeEmotion: '#DD6B20'
    },
    fonts: {
      primary: 'Roboto',
      secondary: 'Open Sans'
    }
  }
};
```

## Performance Considerations

### Rate Limiting

The library automatically handles Miro API rate limiting:

```typescript
const config: MiroConfig = {
  accessToken: 'token',
  baseUrl: 'https://api.miro.com/v2',
  timeout: 45000,     // Increased timeout
  retryAttempts: 5,   // More retry attempts
  retryDelay: 2000    // Longer delay between retries
};
```

### Batch Processing

For large journey maps, use batch processing:

```typescript
const apiConfig: ApiConfig = {
  rateLimit: 50,           // Requests per minute
  batchSize: 5,            // Items per batch
  concurrentRequests: 3,   // Concurrent API calls
  timeout: 60000
};
```

### Memory Management

```typescript
const performanceConfig: PerformanceConfig = {
  memoryLimit: 1024,        // MB
  processingTimeout: 600000, // 10 minutes
  maxFileSize: 100 * 1024 * 1024, // 100MB
  cacheEnabled: true
};
```