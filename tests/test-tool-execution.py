#!/usr/bin/env python3
"""
Test script to directly execute tool calls and verify functionality
without relying on Claude's agent implementation
"""

import os
import sys
import json
import uuid
import requests
import logging
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("tool-test")

# Service URLs
AGENT_URL = os.environ.get("AGENT_URL", "http://localhost:8500")
JOURNEY_MCP_URL = os.environ.get("JOURNEY_MCP_URL", "http://localhost:8503")
REDDIT_MCP_URL = os.environ.get("REDDIT_MCP_URL", "http://localhost:8501")
SOCIAL_MCP_URL = os.environ.get("SOCIAL_MCP_URL", "http://localhost:8502")

def test_service_health(service_name, url):
    """Test if a service is healthy by checking its health endpoint"""
    try:
        response = requests.get(urljoin(url, "health"), timeout=5)
        if response.status_code == 200:
            logger.info(f"✅ {service_name} is healthy: {response.json()}")
            return True
        else:
            logger.error(f"❌ {service_name} health check failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ {service_name} health check error: {str(e)}")
        return False

def test_journey_upload(file_path):
    """Test uploading a file to the journey mapper"""
    logger.info(f"Testing journey.upload_file with {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return None
    
    try:
        # Open file in binary mode
        with open(file_path, "rb") as f:
            file_content = f.read()
            
        # Create multipart form data with file
        files = {
            "file": (os.path.basename(file_path), file_content)
        }
        
        # Add metadata as form fields
        data = {
            "file_name": os.path.basename(file_path),
        }
        
        # Make POST request to journey-mcp
        upload_url = urljoin(JOURNEY_MCP_URL, "mcp/invoke/journey.upload_file")
        logger.info(f"Sending request to: {upload_url}")
        
        response = requests.post(upload_url, files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ File upload successful: {result}")
            return result
        else:
            logger.error(f"❌ File upload failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error uploading file: {str(e)}")
        return None

def test_journey_generate(file_id, journey_name="Test Journey"):
    """Test generating a journey map"""
    logger.info(f"Testing journey.generate_map with file_id: {file_id}")
    
    try:
        # Create form data
        data = {
            "file_id": file_id,
            "journey_name": journey_name,
            "description": "Test journey map generation"
        }
        
        # Make POST request to journey-mcp
        generate_url = urljoin(JOURNEY_MCP_URL, "mcp/invoke/journey.generate_map")
        logger.info(f"Sending request to: {generate_url}")
        
        response = requests.post(generate_url, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ Journey map generation initiated: {result}")
            return result
        else:
            logger.error(f"❌ Journey map generation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error generating journey map: {str(e)}")
        return None

def test_journey_status(journey_id):
    """Test checking journey status"""
    logger.info(f"Testing journey.get_status with journey_id: {journey_id}")
    
    try:
        # Create form data
        data = {
            "journey_id": journey_id
        }
        
        # Make POST request to journey-mcp
        status_url = urljoin(JOURNEY_MCP_URL, "mcp/invoke/journey.get_status")
        logger.info(f"Sending request to: {status_url}")
        
        response = requests.post(status_url, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ Journey status check: {result}")
            return result
        else:
            logger.error(f"❌ Journey status check failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error checking journey status: {str(e)}")
        return None

def test_reddit_search(subreddit="MachineLearning", limit=10):
    """Test reddit search functionality"""
    logger.info(f"Testing reddit.search with subreddit: {subreddit}")
    
    try:
        # Create form data
        data = {
            "subreddit": subreddit,
            "limit": limit,
            "time_filter": "week",
            "comments_per_post": 5
        }
        
        # Make POST request to reddit-mcp
        search_url = urljoin(REDDIT_MCP_URL, "mcp/invoke/reddit.search")
        logger.info(f"Sending request to: {search_url}")
        
        response = requests.post(search_url, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ Reddit search initiated: {result}")
            return result
        else:
            logger.error(f"❌ Reddit search failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error searching Reddit: {str(e)}")
        return None

def test_reddit_status(job_id):
    """Test checking Reddit job status"""
    logger.info(f"Testing reddit.get_status with job_id: {job_id}")
    
    try:
        # Create form data
        data = {
            "job_id": job_id
        }
        
        # Make POST request to reddit-mcp
        status_url = urljoin(REDDIT_MCP_URL, "mcp/invoke/reddit.get_status")
        logger.info(f"Sending request to: {status_url}")
        
        response = requests.post(status_url, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ Reddit status check: {result}")
            return result
        else:
            logger.error(f"❌ Reddit status check failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error checking Reddit status: {str(e)}")
        return None

def test_reddit_generate_pdf(subreddit="MachineLearning", limit=10):
    """Test PDF generation functionality"""
    logger.info(f"Testing reddit.generate_pdf with subreddit: {subreddit}")
    
    try:
        # Create form data
        data = {
            "subreddit": subreddit,
            "limit": limit,
            "time_filter": "week",
            "comments_per_post": 5
        }
        
        # Make POST request to reddit-mcp
        pdf_url = urljoin(REDDIT_MCP_URL, "mcp/invoke/reddit.generate_pdf")
        logger.info(f"Sending request to: {pdf_url}")
        
        response = requests.post(pdf_url, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ PDF generation initiated: {result}")
            return result
        else:
            logger.error(f"❌ PDF generation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error generating PDF: {str(e)}")
        return None

def test_reddit_get_results(job_id):
    """Test getting Reddit results"""
    logger.info(f"Testing reddit.get_results with job_id: {job_id}")
    
    try:
        # Create form data
        data = {
            "job_id": job_id,
            "include_content": True
        }
        
        # Make POST request to reddit-mcp
        results_url = urljoin(REDDIT_MCP_URL, "mcp/invoke/reddit.get_results")
        logger.info(f"Sending request to: {results_url}")
        
        response = requests.post(results_url, data=data)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"✅ Reddit results retrieved")
            logger.info(f"PDF URLs: {result.get('pdf_urls', [])}")
            
            if 'debug_info' in result:
                logger.info(f"Debug info: {json.dumps(result['debug_info'], indent=2)}")
                
            return result
        else:
            logger.error(f"❌ Reddit results retrieval failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error retrieving Reddit results: {str(e)}")
        return None

def main():
    """Main test function"""
    logger.info("Starting tool execution test")
    
    # Test service health
    service_statuses = {
        "journey-mcp": test_service_health("journey-mcp", JOURNEY_MCP_URL),
        "reddit-mcp": test_service_health("reddit-mcp", REDDIT_MCP_URL),
        "social-mcp": test_service_health("social-mcp", SOCIAL_MCP_URL),
    }
    
    if not all(service_statuses.values()):
        logger.error("Not all services are healthy. Check service status above.")
        return
    
    # Ask which test to run
    print("\nWhich test would you like to run?")
    print("1. Journey Map Flow (upload file, generate map, check status)")
    print("2. Reddit Data Collection Flow (search, check status, get results)")
    print("3. PDF Generation Flow (generate PDF, check status, get results)")
    print("4. Run All Tests")
    
    try:
        choice = int(input("\nEnter choice (1-4): "))
    except ValueError:
        logger.error("Invalid choice. Please enter a number.")
        return
    
    # Run selected test
    if choice == 1 or choice == 4:
        print("\n=== Testing Journey Map Flow ===")
        file_path = input("Enter PDF file path to upload (or press Enter for default): ")
        if not file_path:
            file_path = "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-journeymapper/uploads/sample.pdf"
            
        result = test_journey_upload(file_path)
        if result and "file_id" in result:
            file_id = result["file_id"]
            generate_result = test_journey_generate(file_id)
            
            if generate_result and "journey_id" in generate_result:
                journey_id = generate_result["journey_id"]
                
                print("Checking journey status (will check 3 times)...")
                for i in range(3):
                    status_result = test_journey_status(journey_id)
                    if status_result and status_result.get("status") == "completed":
                        break
                    print(f"Status: {status_result.get('status', 'unknown')}, Progress: {status_result.get('progress', 0)}%")
                    import time
                    time.sleep(5)
    
    if choice == 2 or choice == 4:
        print("\n=== Testing Reddit Data Collection Flow ===")
        subreddit = input("Enter subreddit to search (or press Enter for default): ")
        if not subreddit:
            subreddit = "MachineLearning"
            
        limit = input("Enter post limit (or press Enter for default): ")
        try:
            limit = int(limit) if limit else 10
        except ValueError:
            limit = 10
            
        result = test_reddit_search(subreddit, limit)
        if result and "job_id" in result:
            job_id = result["job_id"]
            
            print("Checking job status (will check 3 times)...")
            for i in range(3):
                status_result = test_reddit_status(job_id)
                if status_result and status_result.get("status") == "completed":
                    test_reddit_get_results(job_id)
                    break
                print(f"Status: {status_result.get('status', 'unknown')}, Progress: {status_result.get('progress', 0)}%")
                import time
                time.sleep(5)
    
    if choice == 3 or choice == 4:
        print("\n=== Testing PDF Generation Flow ===")
        subreddit = input("Enter subreddit for PDF (or press Enter for default): ")
        if not subreddit:
            subreddit = "MachineLearning"
            
        limit = input("Enter post limit (or press Enter for default): ")
        try:
            limit = int(limit) if limit else 10
        except ValueError:
            limit = 10
            
        result = test_reddit_generate_pdf(subreddit, limit)
        if result and "job_id" in result:
            job_id = result["job_id"]
            
            print("Checking job status (will check 3 times)...")
            for i in range(3):
                status_result = test_reddit_status(job_id)
                if status_result and status_result.get("status") == "completed":
                    test_reddit_get_results(job_id)
                    break
                print(f"Status: {status_result.get('status', 'unknown')}, Progress: {status_result.get('progress', 0)}%")
                import time
                time.sleep(5)
    
    logger.info("Tool execution test completed")

if __name__ == "__main__":
    main()