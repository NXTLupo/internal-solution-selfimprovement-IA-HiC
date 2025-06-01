#!/usr/bin/env python3
"""
This script updates the launchpad's app.py file to add support for the Claude 4 Journey Mapper.
"""

import os
import re
import shutil
import sys

def update_launchpad_app():
    """Update the launchpad app.py file to add support for Claude 4 Journey Mapper"""
    
    # Paths
    launchpad_app_path = os.path.join("..", "launchpad", "app.py")
    backup_path = os.path.join("..", "launchpad", "app.py.bak")
    
    # Check if the file exists
    if not os.path.exists(launchpad_app_path):
        print(f"Error: {launchpad_app_path} not found")
        return False
    
    # Create a backup
    shutil.copy2(launchpad_app_path, backup_path)
    print(f"Created backup at {backup_path}")
    
    # Read the file
    with open(launchpad_app_path, 'r') as f:
        content = f.read()
    
    # Update the environment variables section
    env_vars_pattern = r"def get_dynamic_urls\(\):\s+# Internal URLs for service checks.*?journey_mapper_url = os\.environ\.get\('JOURNEY_MAPPER_URL', 'http://journey-mapper:8000'\)\s+openai_journey_mapper_url = os\.environ\.get\('OPENAI_JOURNEY_MAPPER_URL', 'http://openai-journey-mapper:8000'\)"
    
    env_vars_replacement = """def get_dynamic_urls():
    # Internal URLs for service checks (container to container)
    journey_mapper_url = os.environ.get('JOURNEY_MAPPER_URL', 'http://journey-mapper:8000')
    openai_journey_mapper_url = os.environ.get('OPENAI_JOURNEY_MAPPER_URL', 'http://openai-journey-mapper:8000')
    claude4_journey_mapper_url = os.environ.get('CLAUDE4_JOURNEY_MAPPER_URL', 'http://claude4-journey-mapper:8000')"""
    
    content = re.sub(env_vars_pattern, env_vars_replacement, content, flags=re.DOTALL)
    
    # Update the client URLs section
    client_urls_pattern = r"# External URLs for client browsers.*?journey_mapper_client_url = os\.environ\.get\('JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8080'\)\s+openai_journey_mapper_client_url = os\.environ\.get\('OPENAI_JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8090'\)"
    
    client_urls_replacement = """# External URLs for client browsers
    journey_mapper_client_url = os.environ.get('JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8080')
    openai_journey_mapper_client_url = os.environ.get('OPENAI_JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8090')
    claude4_journey_mapper_client_url = os.environ.get('CLAUDE4_JOURNEY_MAPPER_CLIENT_URL', 'http://localhost:8090')"""
    
    content = re.sub(client_urls_pattern, client_urls_replacement, content, flags=re.DOTALL)
    
    # Update the URLs dictionary
    urls_pattern = r"urls = \{.*?'journey_mapper': \{.*?'internal_url': journey_mapper_url\s+\},\s+'openai_journey_mapper': \{.*?'internal_url': openai_journey_mapper_url\s+\},"
    
    urls_replacement = """urls = {
        'journey_mapper': {
            'client_url': journey_mapper_client_url,
            'internal_url': journey_mapper_url
        },
        'openai_journey_mapper': {
            'client_url': openai_journey_mapper_client_url,
            'internal_url': openai_journey_mapper_url
        },
        'claude4_journey_mapper': {
            'client_url': claude4_journey_mapper_client_url,
            'internal_url': claude4_journey_mapper_url
        },"""
    
    content = re.sub(urls_pattern, urls_replacement, content, flags=re.DOTALL)
    
    # Update the services_status dictionary
    services_pattern = r"services_status = \{.*?\"journey_mapper\": \{\"status\": \"unknown\", \"last_checked\": None\},\s+\"openai_journey_mapper\": \{\"status\": \"unknown\", \"last_checked\": None\},"
    
    services_replacement = """services_status = {
    "journey_mapper": {"status": "unknown", "last_checked": None},
    "openai_journey_mapper": {"status": "unknown", "last_checked": None},
    "claude4_journey_mapper": {"status": "unknown", "last_checked": None},"""
    
    content = re.sub(services_pattern, services_replacement, content, flags=re.DOTALL)
    
    # Update the update_all_services function
    update_services_pattern = r"def update_all_services\(\):.*?check_service\(\"journey_mapper\"\)\s+check_service\(\"openai_journey_mapper\"\)"
    
    update_services_replacement = """def update_all_services():
    \"\"\"Update status of all services\"\"\"
    check_service("journey_mapper")
    check_service("openai_journey_mapper")
    check_service("claude4_journey_mapper")"""
    
    content = re.sub(update_services_pattern, update_services_replacement, content, flags=re.DOTALL)
    
    # Update the service_statuses dictionary in the index route
    index_statuses_pattern = r"service_statuses = \{.*?'journey_mapper': services_status\['journey_mapper'\]\['status'\],\s+'openai_journey_mapper': services_status\['openai_journey_mapper'\]\['status'\],"
    
    index_statuses_replacement = """service_statuses = {
        'journey_mapper': services_status['journey_mapper']['status'],
        'openai_journey_mapper': services_status['openai_journey_mapper']['status'],
        'claude4_journey_mapper': services_status['claude4_journey_mapper']['status'],"""
    
    content = re.sub(index_statuses_pattern, index_statuses_replacement, content, flags=re.DOTALL)
    
    # Update the index route template variables
    index_template_pattern = r"return render_template\('enhanced-index\.html',\s+journey_mapper_url=urls\['journey_mapper'\]\['client_url'\],\s+openai_journey_mapper_url=urls\['openai_journey_mapper'\]\['client_url'\],"
    
    index_template_replacement = """return render_template('enhanced-index.html',
                       journey_mapper_url=urls['journey_mapper']['client_url'],
                       openai_journey_mapper_url=urls['openai_journey_mapper']['client_url'],
                       claude4_journey_mapper_url=urls['claude4_journey_mapper']['client_url'],"""
    
    content = re.sub(index_template_pattern, index_template_replacement, content, flags=re.DOTALL)
    
    # Update the get_urls function result
    get_urls_pattern = r"result = \{.*?'journey_mapper': \{.*?\},\s+'reddit_ripper': \{"
    
    get_urls_replacement = """result = {
        'journey_mapper': {
            'url': urls['journey_mapper']['client_url'],
            'port': extract_port(urls['journey_mapper']['client_url'])
        },
        'openai_journey_mapper': {
            'url': urls['openai_journey_mapper']['client_url'],
            'port': extract_port(urls['openai_journey_mapper']['client_url'])
        },
        'claude4_journey_mapper': {
            'url': urls['claude4_journey_mapper']['client_url'],
            'port': extract_port(urls['claude4_journey_mapper']['client_url'])
        },
        'reddit_ripper': {"""
    
    content = re.sub(get_urls_pattern, get_urls_replacement, content, flags=re.DOTALL)
    
    # Write the updated content back to the file
    with open(launchpad_app_path, 'w') as f:
        f.write(content)
    
    print(f"Updated {launchpad_app_path} to add Claude 4 Journey Mapper support")
    return True

def update_index_template():
    """Update the launchpad index.html template to add Claude 4 Journey Mapper card"""
    
    # Paths
    index_template_path = os.path.join("..", "launchpad", "templates", "index.html")
    enhanced_index_template_path = os.path.join("..", "launchpad", "templates", "enhanced-index.html")
    backup_path = os.path.join("..", "launchpad", "templates", "enhanced-index.html.bak")
    
    # Check if the enhanced template exists
    if not os.path.exists(enhanced_index_template_path):
        print(f"Error: {enhanced_index_template_path} not found")
        return False
    
    # Create a backup
    shutil.copy2(enhanced_index_template_path, backup_path)
    print(f"Created backup at {backup_path}")
    
    # Read the file
    with open(enhanced_index_template_path, 'r') as f:
        content = f.read()
    
    # Add Claude 4 Journey Mapper card after the OpenAI Journey Mapper card
    journey_mapper_card_pattern = r'<div class="app-card scale-in animate-delay-5">.*?<h3 class="app-title">Journey Mapper \(o3\)</h3>.*?</div>\s+</div>'
    
    journey_mapper_card_replacement = """<div class="app-card scale-in animate-delay-5">
        <div class="status-indicator status-unknown" id="openai-journey-mapper-status"></div>
        <div class="app-icon">
          <i class="fa-solid fa-map-location-dot"></i>
        </div>
        <h3 class="app-title">Journey Mapper (o3)</h3>
        <p class="app-description">Generate interactive journey maps with OpenAI's specialized o3 reasoning model for complex analysis.</p>
        <div class="app-cta">
          <a href="{{ openai_journey_mapper_url }}" id="openai-journey-mapper-url" target="_blank" class="nxt-btn nxt-btn-primary nxt-btn-block">
            <i class="fa-solid fa-play mr-2"></i> Launch
          </a>
        </div>
      </div>

      <div class="app-card scale-in animate-delay-6">
        <div class="status-indicator status-unknown" id="claude4-journey-mapper-status"></div>
        <div class="app-icon">
          <i class="fa-solid fa-diagram-project"></i>
        </div>
        <h3 class="app-title">Journey Mapper (Claude 4)</h3>
        <p class="app-description">Generate enhanced journey maps with Claude 4's advanced reasoning capabilities for deeper customer insights.</p>
        <div class="app-cta">
          <a href="{{ claude4_journey_mapper_url }}" id="claude4-journey-mapper-url" target="_blank" class="nxt-btn nxt-btn-primary nxt-btn-block">
            <i class="fa-solid fa-play mr-2"></i> Launch
          </a>
        </div>
      </div>
    </div>"""
    
    content = re.sub(journey_mapper_card_pattern, journey_mapper_card_replacement, content, flags=re.DOTALL)
    
    # Add the Claude 4 Journey Mapper status indicator to the script
    status_indicators_pattern = r"const openaiJourneyMapperStatus = document\.getElementById\('openai-journey-mapper-status'\);"
    
    status_indicators_replacement = """const openaiJourneyMapperStatus = document.getElementById('openai-journey-mapper-status');
    const claude4JourneyMapperStatus = document.getElementById('claude4-journey-mapper-status');"""
    
    content = re.sub(status_indicators_pattern, status_indicators_replacement, content)
    
    # Add the Claude 4 Journey Mapper URL link to the script
    url_links_pattern = r"const openaiJourneyMapperUrlLink = document\.getElementById\('openai-journey-mapper-url'\);"
    
    url_links_replacement = """const openaiJourneyMapperUrlLink = document.getElementById('openai-journey-mapper-url');
    const claude4JourneyMapperUrlLink = document.getElementById('claude4-journey-mapper-url');"""
    
    content = re.sub(url_links_pattern, url_links_replacement, content)
    
    # Add the Claude 4 Journey Mapper URL display to the script
    url_displays_pattern = r"const openaiJourneyMapperUrlDisplay = document\.getElementById\('openai-journey-mapper-url-display'\);"
    
    url_displays_replacement = """const openaiJourneyMapperUrlDisplay = document.getElementById('openai-journey-mapper-url-display');
    const claude4JourneyMapperUrlDisplay = document.getElementById('claude4-journey-mapper-url-display');"""
    
    content = re.sub(url_displays_pattern, url_displays_replacement, content)
    
    # Add the Claude 4 Journey Mapper port display to the script
    port_displays_pattern = r"const openaiJourneyMapperPortDisplay = document\.getElementById\('openai-journey-mapper-port-display'\);"
    
    port_displays_replacement = """const openaiJourneyMapperPortDisplay = document.getElementById('openai-journey-mapper-port-display');
    const claude4JourneyMapperPortDisplay = document.getElementById('claude4-journey-mapper-port-display');"""
    
    content = re.sub(port_displays_pattern, port_displays_replacement, content)
    
    # Add the Claude 4 Journey Mapper port badge to the script
    port_badges_pattern = r"const openaiJourneyMapperPortBadge = document\.getElementById\('openai-journey-mapper-port-badge'\);"
    
    port_badges_replacement = """const openaiJourneyMapperPortBadge = document.getElementById('openai-journey-mapper-port-badge');
    const claude4JourneyMapperPortBadge = document.getElementById('claude4-journey-mapper-port-badge');"""
    
    content = re.sub(port_badges_pattern, port_badges_replacement, content)
    
    # Add Claude 4 Journey Mapper URL variables to the script
    url_variables_pattern = r"let openaiJourneyMapperUrl = \"{{ openai_journey_mapper_url }}\";"
    
    url_variables_replacement = """let openaiJourneyMapperUrl = "{{ openai_journey_mapper_url }}";
    let claude4JourneyMapperUrl = "{{ claude4_journey_mapper_url }}";"""
    
    content = re.sub(url_variables_pattern, url_variables_replacement, content)
    
    # Add Claude 4 Journey Mapper port variables to the script
    port_variables_pattern = r"let openaiJourneyMapperPort = \"8090\";"
    
    port_variables_replacement = """let openaiJourneyMapperPort = "8090";
    let claude4JourneyMapperPort = "8090";"""
    
    content = re.sub(port_variables_pattern, port_variables_replacement, content)
    
    # Update the updateUrls function to include Claude 4 Journey Mapper
    update_urls_pattern = r"openaiJourneyMapperUrlLink\.href = openaiJourneyMapperUrl;"
    
    update_urls_replacement = """openaiJourneyMapperUrlLink.href = openaiJourneyMapperUrl;
      claude4JourneyMapperUrlLink.href = claude4JourneyMapperUrl;"""
    
    content = re.sub(update_urls_pattern, update_urls_replacement, content)
    
    # Update URL displays
    url_displays_update_pattern = r"openaiJourneyMapperUrlDisplay\.textContent = openaiJourneyMapperUrl;"
    
    url_displays_update_replacement = """openaiJourneyMapperUrlDisplay.textContent = openaiJourneyMapperUrl;
      claude4JourneyMapperUrlDisplay.textContent = claude4JourneyMapperUrl;"""
    
    content = re.sub(url_displays_update_pattern, url_displays_update_replacement, content)
    
    # Update port displays
    port_displays_update_pattern = r"openaiJourneyMapperPortDisplay\.textContent = openaiJourneyMapperPort;"
    
    port_displays_update_replacement = """openaiJourneyMapperPortDisplay.textContent = openaiJourneyMapperPort;
      claude4JourneyMapperPortDisplay.textContent = claude4JourneyMapperPort;"""
    
    content = re.sub(port_displays_update_pattern, port_displays_update_replacement, content)
    
    # Update port badge styling
    port_badge_update_pattern = r"updatePortBadge\(openaiJourneyMapperPortBadge, openaiJourneyMapperPort, \"8090\"\);"
    
    port_badge_update_replacement = """updatePortBadge(openaiJourneyMapperPortBadge, openaiJourneyMapperPort, "8090");
      updatePortBadge(claude4JourneyMapperPortBadge, claude4JourneyMapperPort, "8090");"""
    
    content = re.sub(port_badge_update_pattern, port_badge_update_replacement, content)
    
    # Update fetchUpdatedUrls function to include Claude 4 Journey Mapper
    fetch_urls_pattern = r"if \(data\.openai_journey_mapper\) \{.*?openaiJourneyMapperPort = data\.openai_journey_mapper\.port;\s+\}"
    
    fetch_urls_replacement = """if (data.openai_journey_mapper) {
          openaiJourneyMapperUrl = data.openai_journey_mapper.url;
          openaiJourneyMapperPort = data.openai_journey_mapper.port;
        }
        
        if (data.claude4_journey_mapper) {
          claude4JourneyMapperUrl = data.claude4_journey_mapper.url;
          claude4JourneyMapperPort = data.claude4_journey_mapper.port;
        }"""
    
    content = re.sub(fetch_urls_pattern, fetch_urls_replacement, content, flags=re.DOTALL)
    
    # Update updateServiceStatus function to include Claude 4 Journey Mapper
    update_status_pattern = r"if \(data\.services && data\.services\.openai_journey_mapper\) \{.*?updateStatusIndicator\(openaiJourneyMapperStatus, data\.services\.openai_journey_mapper\.status\);\s+\}"
    
    update_status_replacement = """if (data.services && data.services.openai_journey_mapper) {
          updateStatusIndicator(openaiJourneyMapperStatus, data.services.openai_journey_mapper.status);
        }
        
        if (data.services && data.services.claude4_journey_mapper) {
          updateStatusIndicator(claude4JourneyMapperStatus, data.services.claude4_journey_mapper.status);
        }"""
    
    content = re.sub(update_status_pattern, update_status_replacement, content, flags=re.DOTALL)
    
    # Update launchAllBtn event listener to include Claude 4 Journey Mapper
    launch_all_pattern = r"setTimeout\(\(\) => window\.open\(openaiJourneyMapperUrl, '_blank'\), 1200\);"
    
    launch_all_replacement = """setTimeout(() => window.open(openaiJourneyMapperUrl, '_blank'), 1200);
      setTimeout(() => window.open(claude4JourneyMapperUrl, '_blank'), 1500);"""
    
    content = re.sub(launch_all_pattern, launch_all_replacement, content)
    
    # Add Claude 4 Journey Mapper URL display to the service URLs section
    service_urls_pattern = r'<div class="url-item">.*?<div class="url-label"><i class="fa-solid fa-map-location-dot mr-2"></i> Journey Mapper \(o3\):</div>.*?</div>'
    
    service_urls_replacement = """<div class="url-item">
        <div class="url-label"><i class="fa-solid fa-map-location-dot mr-2"></i> Journey Mapper (o3):</div>
        <div class="url-value" id="openai-journey-mapper-url-display"></div>
        <div class="port-badge" id="openai-journey-mapper-port-badge">Port: <span id="openai-journey-mapper-port-display">8090</span></div>
      </div>
      <div class="url-item">
        <div class="url-label"><i class="fa-solid fa-diagram-project mr-2"></i> Journey Mapper (Claude 4):</div>
        <div class="url-value" id="claude4-journey-mapper-url-display"></div>
        <div class="port-badge" id="claude4-journey-mapper-port-badge">Port: <span id="claude4-journey-mapper-port-display">8090</span></div>
      </div>"""
    
    content = re.sub(service_urls_pattern, service_urls_replacement, content, flags=re.DOTALL)
    
    # Write the updated content back to the file
    with open(enhanced_index_template_path, 'w') as f:
        f.write(content)
    
    print(f"Updated {enhanced_index_template_path} to add Claude 4 Journey Mapper card")
    return True

def main():
    """Main function"""
    success = update_launchpad_app()
    if success:
        success = update_index_template()
    
    if success:
        print("Successfully updated launchpad to add Claude 4 Journey Mapper")
        return 0
    else:
        print("Failed to update launchpad")
        return 1

if __name__ == "__main__":
    sys.exit(main())