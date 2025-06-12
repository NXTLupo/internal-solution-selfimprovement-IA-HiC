#!/bin/bash

# Test Miro Integration Script
# Demonstrates the complete pipeline from journey mapper to Miro board

set -e

echo "🚀 Testing NXT Miro Generator Integration"
echo "========================================"

# Configuration
WORKBENCH_DIR="/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH"
JOURNEY_MAPPER_DIR="${WORKBENCH_DIR}/internal-solutions-journeymapper"
MIRO_GENERATOR_DIR="${WORKBENCH_DIR}/internal-solutions-miro-generator"
OUTPUT_DIR="${WORKBENCH_DIR}/miro-integration-test"

echo "📁 Directories:"
echo "   Journey Mapper: ${JOURNEY_MAPPER_DIR}"
echo "   Miro Generator: ${MIRO_GENERATOR_DIR}"
echo "   Output: ${OUTPUT_DIR}"
echo ""

# Step 1: Check prerequisites
echo "🔍 Checking prerequisites..."

if [ ! -d "$JOURNEY_MAPPER_DIR" ]; then
    echo "❌ Journey Mapper not found at: $JOURNEY_MAPPER_DIR"
    exit 1
fi

if [ ! -d "$MIRO_GENERATOR_DIR" ]; then
    echo "❌ Miro Generator not found at: $MIRO_GENERATOR_DIR"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 2: Setup Miro Generator
echo "⚙️  Setting up Miro Generator..."
cd "$MIRO_GENERATOR_DIR"

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

if [ ! -f "dist/cli/index.js" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
fi

echo "✅ Miro Generator setup complete"
echo ""

# Step 3: Find journey map files
echo "🔍 Looking for journey map files..."
JOURNEY_MAPS_DIR="${JOURNEY_MAPPER_DIR}/journey_maps"

if [ ! -d "$JOURNEY_MAPS_DIR" ]; then
    echo "📁 Journey maps directory not found, checking alternative locations..."
    JOURNEY_MAPS_DIR="${JOURNEY_MAPPER_DIR}/static"
    if [ ! -d "$JOURNEY_MAPS_DIR" ]; then
        echo "⚠️  No existing journey maps found, using sample file..."
        JOURNEY_MAP_FILE="${MIRO_GENERATOR_DIR}/examples/sample-journey-map.html"
    fi
else
    # Find the most recent HTML file
    JOURNEY_MAP_FILE=$(find "$JOURNEY_MAPS_DIR" -name "*.html" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
fi

if [ -z "$JOURNEY_MAP_FILE" ] || [ ! -f "$JOURNEY_MAP_FILE" ]; then
    echo "⚠️  No journey map HTML files found, using sample..."
    JOURNEY_MAP_FILE="${MIRO_GENERATOR_DIR}/examples/sample-journey-map.html"
fi

echo "📄 Using journey map: $(basename "$JOURNEY_MAP_FILE")"
echo ""

# Step 4: Validate journey map
echo "✅ Validating journey map HTML..."
if node dist/cli/index.js validate -i "$JOURNEY_MAP_FILE" --verbose; then
    echo "✅ Journey map validation passed"
else
    echo "❌ Journey map validation failed"
    exit 1
fi
echo ""

# Step 5: Test Miro API configuration (dry run)
echo "🧪 Testing Miro board generation (dry run)..."
mkdir -p "$OUTPUT_DIR"

if node dist/cli/index.js generate -i "$JOURNEY_MAP_FILE" -o "$OUTPUT_DIR" --dry-run --verbose; then
    echo "✅ Dry run completed successfully"
else
    echo "❌ Dry run failed"
    exit 1
fi
echo ""

# Step 6: Generate actual output (without Miro API)
echo "📊 Generating analysis and layout..."
if node -e "
const path = require('path');
const fs = require('fs');

async function runIntegrationTest() {
  try {
    console.log('Loading modules...');
    const { runManualIntegrationTest } = require('./dist/tests/integration/full-pipeline.test.js');
    
    console.log('Running integration test...');
    await runManualIntegrationTest('$JOURNEY_MAP_FILE');
    
    console.log('✅ Integration test completed successfully');
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

runIntegrationTest();
"; then
    echo "✅ Integration analysis completed"
else
    echo "❌ Integration analysis failed"
    exit 1
fi
echo ""

# Step 7: Display results
echo "📋 Integration Test Results:"
echo "=========================="

if [ -f "${MIRO_GENERATOR_DIR}/output/integration-test/integration-summary.json" ]; then
    echo "📊 Summary:"
    cat "${MIRO_GENERATOR_DIR}/output/integration-test/integration-summary.json" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    console.log(\`  Journey Map: \${data.journeyMap.title}\`);
    console.log(\`  Phases: \${data.journeyMap.phases.length}\`);
    console.log(\`  Total Elements: \${data.journeyMap.phases.reduce((sum, p) => sum + Object.values(p.elements).reduce((s, v) => s + v, 0), 0)}\`);
    console.log(\`  Layout Efficiency: \${data.layout.stats.efficiency.toFixed(1)}%\`);
    console.log(\`  Board Dimensions: \${Math.round(data.layout.bounds.width)}x\${Math.round(data.layout.bounds.height)}\`);
    "
fi
echo ""

# Step 8: Integration instructions
echo "🎯 Next Steps for Full Integration:"
echo "=================================="
echo ""
echo "1. 🔑 Set up Miro API Access:"
echo "   • Visit: https://miro.com/app/settings/user-profile/apps"
echo "   • Create a new app and get your access token"
echo "   • Run: cd ${MIRO_GENERATOR_DIR} && npx miro-gen config --init"
echo ""
echo "2. 🎨 Generate Miro Board:"
echo "   • Run: npx miro-gen generate -i \"$JOURNEY_MAP_FILE\""
echo "   • Or with board ID: npx miro-gen generate -i \"$JOURNEY_MAP_FILE\" --board-id YOUR_BOARD_ID"
echo ""
echo "3. 🔄 Automate the Pipeline:"
echo "   • Use file watchers for automatic conversion"
echo "   • Set up webhooks for real-time integration"
echo "   • Implement CI/CD pipelines for team workflows"
echo ""
echo "4. 📖 Documentation:"
echo "   • Read: ${MIRO_GENERATOR_DIR}/INTEGRATION_GUIDE.md"
echo "   • API docs: ${MIRO_GENERATOR_DIR}/docs/API.md"
echo "   • Examples: ${MIRO_GENERATOR_DIR}/examples/"
echo ""

# Step 9: Test automation example
echo "🤖 Example Automation Script:"
echo "=============================="
cat << 'EOF'
#!/bin/bash
# Save as: scripts/auto-journey-to-miro.sh

JOURNEY_FILE="$1"
MIRO_TOKEN="${MIRO_ACCESS_TOKEN}"

if [ -z "$JOURNEY_FILE" ] || [ -z "$MIRO_TOKEN" ]; then
    echo "Usage: $0 <journey-file.html>"
    echo "Set MIRO_ACCESS_TOKEN environment variable"
    exit 1
fi

cd internal-solutions-miro-generator
npx miro-gen generate -i "$JOURNEY_FILE" --verbose

echo "🎉 Miro board created successfully!"
EOF
echo ""

echo "🎉 Integration test completed successfully!"
echo ""
echo "📁 Output files saved to:"
echo "   ${MIRO_GENERATOR_DIR}/output/integration-test/"
echo ""
echo "🚀 Ready to create Miro boards from journey maps!"