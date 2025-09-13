#!/bin/bash
# Fix chatbot visibility

# Force environment variable
export ENABLE_CX_AGENT=true

# Update template if needed
sed -i "s/<body/<body data-enable-agent=\"true\"/g" /app/templates/enhanced-index.html

# Make sure chatbot.js script is included
grep -q "chatbot.js" /app/templates/enhanced-index.html || sed -i "s/<\/body>/  <!-- Chatbot Widget Script -->\n  <script src=\"\/static\/chatbot.js\"><\/script>\n<\/body>/g" /app/templates/enhanced-index.html

# Kill the current app.py process and restart it
pkill -f "python app.py" || true
cd /app && python app.py > /dev/null 2>&1 &

echo "Launchpad restarted with chatbot enabled!"
