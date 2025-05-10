#!/bin/bash
# Install wkhtmltopdf for PDF export functionality

echo "Installing wkhtmltopdf for PDF export functionality..."

# Check if wkhtmltopdf is already installed
if command -v wkhtmltopdf &> /dev/null; then
    echo "wkhtmltopdf is already installed:"
    wkhtmltopdf --version
    echo "Checking if it works properly..."
    
    # Create a simple test HTML file
    echo "<html><body><h1>Test PDF Generation</h1><p>This is a test.</p></body></html>" > test.html
    
    # Try to convert it to PDF
    if wkhtmltopdf test.html test.pdf &> /dev/null; then
        echo "wkhtmltopdf is working correctly!"
        rm test.html test.pdf
        exit 0
    else
        echo "Existing wkhtmltopdf installation seems to have issues. Reinstalling..."
        rm test.html
        if [ -f test.pdf ]; then
            rm test.pdf
        fi
    fi
fi

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux (Ubuntu/Debian)
    echo "Detected Linux system, installing via apt..."
    sudo apt-get update
    sudo apt-get install -y wkhtmltopdf xvfb
    
    # Create a wrapper script for using wkhtmltopdf with xvfb on headless servers
    if [ ! -f /usr/local/bin/wkhtmltopdf-xvfb ]; then
        echo "Creating xvfb wrapper for headless environments..."
        sudo tee /usr/local/bin/wkhtmltopdf-xvfb > /dev/null << 'EOF'
#!/bin/bash
xvfb-run -a --server-args="-screen 0 1280x1024x24" /usr/bin/wkhtmltopdf "$@"
EOF
        sudo chmod +x /usr/local/bin/wkhtmltopdf-xvfb
        echo "Created xvfb wrapper at /usr/local/bin/wkhtmltopdf-xvfb"
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac OSX
    echo "Detected macOS system, installing via Homebrew..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install wkhtmltopdf
    brew install wkhtmltopdf
    
    # Create a symlink to ensure it's in the PATH
    if [ ! -f /usr/local/bin/wkhtmltopdf ]; then
        echo "Creating symlink to wkhtmltopdf in /usr/local/bin..."
        BREW_WKHTMLTOPDF=$(which wkhtmltopdf)
        sudo ln -s "$BREW_WKHTMLTOPDF" /usr/local/bin/wkhtmltopdf
    fi
    
else
    # Windows
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "Detected Windows system. Installing using chocolatey..."
        
        # Check if chocolatey is installed
        if ! command -v choco &> /dev/null; then
            echo "Chocolatey not found. Please install it first:"
            echo "Open PowerShell as administrator and run:"
            echo "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
            exit 1
        fi
        
        # Install wkhtmltopdf using chocolatey
        choco install wkhtmltopdf -y
    else
        # Other OS
        echo "This script doesn't support automatic installation on your platform."
        echo "Please install wkhtmltopdf manually from https://wkhtmltopdf.org/downloads.html"
        exit 1
    fi
fi

# Verify installation
echo "Verifying wkhtmltopdf installation..."
if command -v wkhtmltopdf &> /dev/null; then
    echo "wkhtmltopdf is successfully installed:"
    wkhtmltopdf --version
    
    # Test if it works
    echo "<html><body><h1>Test PDF Generation</h1><p>Installation successful!</p></body></html>" > test.html
    if wkhtmltopdf test.html test.pdf &> /dev/null; then
        echo "wkhtmltopdf is working correctly!"
        echo "You can now generate PDFs on the server side."
        rm test.html test.pdf
        exit 0
    else
        echo "WARNING: wkhtmltopdf is installed but there may be issues with PDF generation."
        echo "You might need to install the patched QT version from https://wkhtmltopdf.org/downloads.html"
        rm test.html
        if [ -f test.pdf ]; then
            rm test.pdf
        fi
        exit 1
    fi
else
    echo "ERROR: wkhtmltopdf installation failed."
    echo "Please install manually from https://wkhtmltopdf.org/downloads.html"
    exit 1
fi