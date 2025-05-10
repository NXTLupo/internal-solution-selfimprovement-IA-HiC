#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Create NXT Humans Workbench.command on the desktop
DESKTOP_DIR="$HOME/Desktop"
LAUNCHER_PATH="$DESKTOP_DIR/NXT Humans Workbench.command"

# Create the launcher script
cat > "$LAUNCHER_PATH" << EOF
#!/bin/bash

# Go to the workbench directory and run launch.sh
cd "$SCRIPT_DIR"
./launch.sh
EOF

# Make it executable
chmod +x "$LAUNCHER_PATH"

# Copy logo for the icon if available
LOGO_PATH="$SCRIPT_DIR/launchpad/static/nxt-humans-logo.png"
ICON_PATH="$DESKTOP_DIR/.nxt-humans-icon.png"

if [ -f "$LOGO_PATH" ]; then
    cp "$LOGO_PATH" "$ICON_PATH"
    
    # Try to set custom icon on macOS
    if [ "$(uname)" == "Darwin" ]; then
        # Use AppleScript to set the custom icon
        osascript -e "tell application \"Finder\"" \
                 -e "set file_path to POSIX file \"$LAUNCHER_PATH\"" \
                 -e "set icon_path to POSIX file \"$ICON_PATH\"" \
                 -e "set f to (file file_path as alias)" \
                 -e "tell application \"System Events\" to tell disk item icon_path to set allItems to entire contents" \
                 -e "set icon of f to contents of icon_path" \
                 -e "end tell" 2>/dev/null || true
    fi
fi

echo "Desktop icon created at: $LAUNCHER_PATH"
echo "You can now double-click the 'NXT Humans Workbench' icon on your desktop to start the workbench."
echo "Press Enter to exit..."
read