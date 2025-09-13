#!/usr/bin/env python3
"""
WebSocket Connection Issues Fix
==============================
Fixes the connection issues identified in the chatbot logs:

1. Video status check timeouts causing WebSocket disconnections
2. Excessive ping/pong traffic 
3. No graceful error handling for long-running operations
4. Session drops during video transcription status checks

This script applies targeted fixes without disrupting current operations.
"""

import os
import asyncio
import sys

def fix_agent_timeout_configuration():
    """Fix agent timeout configurations for video operations"""
    print("🔧 Fixing agent timeout configuration...")
    
    # Read the current agent app.py
    agent_file = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/mcp-services/agent/app.py"
    
    if not os.path.exists(agent_file):
        print(f"❌ Agent file not found: {agent_file}")
        return False
    
    with open(agent_file, 'r') as f:
        content = f.read()
    
    # Check if timeout is already set to 120 seconds for video operations
    if "timeout=120" in content:
        print("✅ Agent timeout already configured for video operations")
        return True
    
    # Update timeout for video operations specifically
    # Find the line with timeout=30 and replace for video operations
    if "timeout=30" in content:
        # Create backup
        backup_file = f"{agent_file}.backup.websocket_fix"
        with open(backup_file, 'w') as f:
            f.write(content)
        print(f"📄 Backup created: {backup_file}")
        
        # Replace with conditional timeout based on tool name
        new_content = content.replace(
            'response = requests.post(tool_url, files=files, data=form_data, timeout=30)',
            '''# Use longer timeout for video operations
        timeout = 120 if tool_name.startswith('video.') else 30
        response = requests.post(tool_url, files=files, data=form_data, timeout=timeout)'''
        )
        
        new_content = new_content.replace(
            'response = requests.post(tool_url, data=form_data, timeout=30)',
            '''# Use longer timeout for video operations  
        timeout = 120 if tool_name.startswith('video.') else 30
        response = requests.post(tool_url, data=form_data, timeout=timeout)'''
        )
        
        # Write the updated content
        with open(agent_file, 'w') as f:
            f.write(new_content)
        
        print("✅ Agent timeout configuration updated for video operations")
        return True
    else:
        print("❌ Could not find timeout configuration to update")
        return False

def create_improved_chatbot_js():
    """Create an improved chatbot.js with better error handling"""
    print("🔧 Creating improved chatbot.js with better error handling...")
    
    chatbot_file = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/launchpad/static/chatbot.js"
    
    if not os.path.exists(chatbot_file):
        print(f"❌ Chatbot file not found: {chatbot_file}")
        return False
    
    with open(chatbot_file, 'r') as f:
        content = f.read()
    
    # Check if improvements are already applied
    if "connection_retry_count" in content:
        print("✅ Chatbot.js already has improved error handling")
        return True
    
    # Create backup
    backup_file = f"{chatbot_file}.backup.websocket_fix"
    with open(backup_file, 'w') as f:
        f.write(content)
    print(f"📄 Backup created: {backup_file}")
    
    # Add improved error handling and connection management
    improvements = '''
    
  // Add connection retry logic
  connection_retry_count = 0;
  max_retries = 3;
  retry_delay = 5000; // 5 seconds
  
  /**
   * Improved setupPingInterval with less aggressive pinging
   */
  setupPingInterval() {
    console.log('ChatbotWidget.setupPingInterval() called');
    // Reduced ping frequency from 30s to 60s to reduce network noise
    setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('Sending ping to keep WebSocket alive');
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 60000); // Send ping every 60 seconds instead of 30
  }
  
  /**
   * Handle WebSocket disconnection with retry logic
   */
  handleDisconnection(event) {
    console.warn('WebSocket disconnected:', event);
    
    if (this.connection_retry_count < this.max_retries) {
      this.connection_retry_count++;
      console.log(`Attempting to reconnect... (${this.connection_retry_count}/${this.max_retries})`);
      
      // Show user-friendly message
      this.addMessage('system', `Connection lost. Attempting to reconnect... (${this.connection_retry_count}/${this.max_retries})`);
      
      // Retry connection after delay
      setTimeout(() => {
        this.initWebSocket();
      }, this.retry_delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.addMessage('system', 'Connection lost. Please refresh the page to reconnect.');
    }
  }
  
  /**
   * Add timeout handling for long-running operations
   */
  addTimeoutMessage() {
    this.addMessage('system', 'This operation is taking longer than usual. Please wait while we process your request...');
  }
'''
    
    # Replace the existing setupPingInterval method
    if "setupPingInterval() {" in content:
        # Find the method and replace it
        start_marker = "setupPingInterval() {"
        end_marker = "}, 30000); // Send ping every 30 seconds\n  }"
        
        start_pos = content.find(start_marker)
        end_pos = content.find(end_marker) + len(end_marker)
        
        if start_pos != -1 and end_pos != -1:
            # Replace the method with improved version
            new_content = content[:start_pos] + improvements[1:] + content[end_pos:]
            
            # Add disconnection handler to WebSocket initialization
            new_content = new_content.replace(
                "this.socket.onclose = () => {",
                "this.socket.onclose = (event) => { this.handleDisconnection(event);"
            )
            
            # Add timeout message for video operations
            new_content = new_content.replace(
                "this.showTypingIndicator();",
                """this.showTypingIndicator();
      
      // Add timeout message for video operations
      if (message.toLowerCase().includes('video') || message.toLowerCase().includes('transcrib')) {
        setTimeout(() => {
          if (this.isTyping) {
            this.addTimeoutMessage();
          }
        }, 30000); // Show timeout message after 30 seconds
      }"""
            )
            
            # Write the updated content
            with open(chatbot_file, 'w') as f:
                f.write(new_content)
            
            print("✅ Chatbot.js updated with improved error handling")
            return True
    
    print("❌ Could not find setupPingInterval method to update")
    return False

def create_video_timeout_fix():
    """Create a fix for video MCP service timeouts"""
    print("🔧 Creating video MCP timeout fix...")
    
    video_mcp_file = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/mcp-services/video-mcp/app.py"
    
    if not os.path.exists(video_mcp_file):
        print(f"❌ Video MCP file not found: {video_mcp_file}")
        return False
    
    with open(video_mcp_file, 'r') as f:
        content = f.read()
    
    # Check if timeout fix is already applied
    if "timeout=120" in content:
        print("✅ Video MCP timeout already configured")
        return True
    
    # Create backup
    backup_file = f"{video_mcp_file}.backup.websocket_fix"
    with open(backup_file, 'w') as f:
        f.write(content)
    print(f"📄 Backup created: {backup_file}")
    
    # Update timeout for video status checks
    new_content = content.replace(
        'response = requests.get(f"{VIDEO_ANALYZER_URL}/jobs/{job_id}")',
        'response = requests.get(f"{VIDEO_ANALYZER_URL}/jobs/{job_id}", timeout=120)'
    )
    
    new_content = new_content.replace(
        'response = requests.get(f"{VIDEO_ANALYZER_URL}/transcript/{job_id}")',
        'response = requests.get(f"{VIDEO_ANALYZER_URL}/transcript/{job_id}", timeout=120)'
    )
    
    # Add retry logic for status checks
    status_check_fix = '''
        # Retry logic for status checks that might timeout
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                response = requests.get(f"{VIDEO_ANALYZER_URL}/jobs/{job_id}", timeout=120)
                break
            except requests.exceptions.Timeout:
                if attempt < max_retries:
                    logger.warning(f"Status check timeout, retrying... (attempt {attempt + 1}/{max_retries + 1})")
                    time.sleep(5)  # Wait 5 seconds before retry
                else:
                    logger.error(f"Status check failed after {max_retries + 1} attempts")
                    return {
                        "status": "error",
                        "message": "Status check timed out. The transcription may still be processing."
                    }
            except Exception as e:
                logger.error(f"Status check error: {str(e)}")
                return {
                    "status": "error", 
                    "message": f"Error checking status: {str(e)}"
                }
'''
    
    # Replace the simple status check with retry logic
    new_content = new_content.replace(
        'logger.info(f"Checking status of job: {job_id}")\n        response = requests.get(f"{VIDEO_ANALYZER_URL}/jobs/{job_id}", timeout=120)',
        f'logger.info(f"Checking status of job: {{job_id}}")\n        \n{status_check_fix.strip()}'
    )
    
    # Add time import if not present
    if "import time" not in new_content:
        new_content = new_content.replace(
            "import logging",
            "import logging\nimport time"
        )
    
    # Write the updated content
    with open(video_mcp_file, 'w') as f:
        f.write(new_content)
    
    print("✅ Video MCP timeout and retry logic configured")
    return True

def main():
    """Apply all WebSocket connection fixes"""
    print("🔧 Applying WebSocket Connection Fixes")
    print("=" * 50)
    print("This script fixes the connection issues identified in the chatbot logs:")
    print("• Video status check timeouts")
    print("• Excessive ping/pong traffic")
    print("• Poor error handling for long operations")
    print("• Session drops during video processing")
    print()
    
    fixes_applied = []
    
    # Apply fixes
    if fix_agent_timeout_configuration():
        fixes_applied.append("Agent timeout configuration")
    
    if create_improved_chatbot_js():
        fixes_applied.append("Chatbot error handling")
    
    if create_video_timeout_fix():
        fixes_applied.append("Video MCP timeout handling")
    
    # Summary
    print("\n📊 Fix Summary")
    print("=" * 50)
    
    if fixes_applied:
        print("✅ Successfully applied fixes:")
        for fix in fixes_applied:
            print(f"   • {fix}")
        
        print("\n🚀 Restart Required")
        print("To apply these fixes, restart the services:")
        print("   docker compose -f docker-compose-all.yml restart agent")
        print("   docker compose -f docker-compose-all.yml restart video-mcp")
        print("   # Refresh browser page for chatbot.js changes")
        
        print("\n💡 Expected Improvements:")
        print("   • Video operations will have 120s timeout instead of 30s")
        print("   • WebSocket ping reduced from 30s to 60s intervals")
        print("   • Automatic reconnection on connection drops")
        print("   • Better user feedback for long operations")
        print("   • Retry logic for video status checks")
        
        sys.exit(0)
    else:
        print("❌ No fixes could be applied. Check file paths and permissions.")
        sys.exit(1)

if __name__ == "__main__":
    main()