/**
 * Unit tests for Journey Map Parser
 */

import { JourneyMapParser } from '../../src/parsers/journey-parser';
import { ParsingConfig } from '../../src/types';

describe('JourneyMapParser', () => {
  let parser: JourneyMapParser;
  let config: ParsingConfig;

  beforeEach(() => {
    config = {
      touchpoints: true,
      painPoints: true,
      quotes: true,
      emotions: true,
      channels: true,
      actions: true
    };
    parser = new JourneyMapParser(config);
  });

  describe('parseFromString', () => {
    it('should parse basic HTML structure', async () => {
      const html = `
        <html>
          <head><title>Test Journey Map</title></head>
          <body>
            <h1>Customer Journey</h1>
            <div class="phase">
              <h2>Awareness</h2>
              <div class="touchpoint">Website Visit</div>
            </div>
          </body>
        </html>
      `;

      const result = await parser.parseFromString(html);

      expect(result.title).toBe('Customer Journey');
      expect(result.phases).toHaveLength(1);
      expect(result.phases[0].name).toBe('Awareness');
    });

    it('should extract touchpoints correctly', async () => {
      const html = `
        <html>
          <body>
            <h1>Test Map</h1>
            <div class="phase">
              <h2>Phase 1</h2>
              <div class="touchpoint" data-type="digital">
                <strong>Online Search</strong>
                <p>Customer searches online</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await parser.parseFromString(html);

      expect(result.phases[0].touchpoints).toHaveLength(1);
      expect(result.phases[0].touchpoints[0].name).toBe('Online Search');
      expect(result.phases[0].touchpoints[0].type).toBe('digital');
    });

    it('should extract pain points with severity', async () => {
      const html = `
        <html>
          <body>
            <h1>Test Map</h1>
            <div class="phase">
              <h2>Phase 1</h2>
              <div class="pain-point" data-severity="high">
                <h4>Login Issues</h4>
                <p>Cannot remember password</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await parser.parseFromString(html);

      expect(result.phases[0].painPoints).toHaveLength(1);
      expect(result.phases[0].painPoints[0].title).toBe('Login Issues');
      expect(result.phases[0].painPoints[0].severity).toBe('high');
    });

    it('should handle missing phases gracefully', async () => {
      const html = `
        <html>
          <body>
            <h1>Test Map</h1>
            <p>No phases defined</p>
          </body>
        </html>
      `;

      const result = await parser.parseFromString(html);

      expect(result.phases).toHaveLength(1); // Should create default phase
    });

    it('should extract emotions with intensity', async () => {
      const html = `
        <html>
          <body>
            <h1>Test Map</h1>
            <div class="phase">
              <h2>Phase 1</h2>
              <div class="emotion positive" data-intensity="8">
                Happy with service
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await parser.parseFromString(html);

      expect(result.phases[0].emotions).toHaveLength(1);
      expect(result.phases[0].emotions[0].type).toBe('positive');
      expect(result.phases[0].emotions[0].intensity).toBe(8);
    });

    it('should respect parsing configuration', async () => {
      const limitedConfig: ParsingConfig = {
        touchpoints: true,
        painPoints: false,
        quotes: false,
        emotions: false,
        channels: false,
        actions: false
      };
      
      const limitedParser = new JourneyMapParser(limitedConfig);
      
      const html = `
        <html>
          <body>
            <h1>Test Map</h1>
            <div class="phase">
              <h2>Phase 1</h2>
              <div class="touchpoint">Touchpoint</div>
              <div class="pain-point">Pain Point</div>
              <div class="quote">Quote</div>
            </div>
          </body>
        </html>
      `;

      const result = await limitedParser.parseFromString(html);

      expect(result.phases[0].touchpoints).toHaveLength(1);
      expect(result.phases[0].painPoints).toHaveLength(0);
      expect(result.phases[0].quotes).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should throw validation error for invalid HTML', async () => {
      const invalidHtml = '<invalid html structure';

      // The parser should handle this gracefully or throw appropriate error
      await expect(parser.parseFromString(invalidHtml)).rejects.toThrow();
    });

    it('should handle empty HTML', async () => {
      const emptyHtml = '';

      await expect(parser.parseFromString(emptyHtml)).rejects.toThrow();
    });
  });
});