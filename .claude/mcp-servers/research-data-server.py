#!/usr/bin/env python3
"""
MCP Data Fabric Server — Research Data Collection

Replaces the Python CORS proxy (port 5012) with a standardized MCP server
that exposes data collection as async tools. Supports SEP-1686 Tasks for
long-running operations.

Tools:
  - query_academic: OpenAlex, Semantic Scholar, Crossref, arXiv, DOAJ
  - query_government: College Scorecard, Federal Register, Data.gov, FRED
  - query_news: GDELT, Higher Ed Dive, EdSurge, Hechinger Report
  - query_social: Reddit, TrustPilot, Play Store
  - query_ai_landscape: arXiv, HuggingFace, Papers with Code
  - deep_research: Gemini grounded search, Claude web search
  - fetch_urls: Jina Reader, YouTube transcription
  - get_collection_status: Check async task progress

Usage:
  This server is registered in .mcp.json and started by Claude Code.
  It wraps the existing research-proxy (port 5012) endpoints.
"""

import json
import sys
import uuid
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError
import os

PROXY_BASE = os.environ.get('RESEARCH_PROXY_URL', 'http://localhost:5012')

# In-memory task storage (SEP-1686 pattern)
tasks = {}

# Source category mappings
SOURCE_CATEGORIES = {
    'query_academic': [
        'openalex', 'semantic_scholar', 'crossref', 'doaj', 'europe_pmc',
        'core', 'datacite', 'zenodo', 'arxiv_cs_ai', 'arxiv_cs_lg',
        'arxiv_cs_cl', 'arxiv_cs_cv', 'openreview', 'dblp'
    ],
    'query_government': [
        'college_scorecard', 'federal_register', 'data_gov', 'fred',
        'usaspending', 'congress_gov', 'sec_edgar'
    ],
    'query_news': [
        'gdelt', 'higher_ed_dive', 'inside_higher_ed', 'edsurge',
        'hechinger_report', 'campus_technology', 'the_conversation', 'open_campus'
    ],
    'query_social': [
        'reddit', 'trustpilot', 'play_store', 'hacker_news'
    ],
    'query_ai_landscape': [
        'arxiv_cs_ai', 'hf_models', 'hf_datasets', 'papers_with_code',
        'openml', 'kaggle', 'github_repos', 'github_trending_ai'
    ],
}


def proxy_search(source_id, query, limit=15):
    """Forward search to existing proxy."""
    try:
        url = f"{PROXY_BASE}/api/search/{source_id}?q={query}&limit={limit}"
        req = Request(url, headers={'Accept': 'application/json'})
        with urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'source': source_id, 'sourceId': source_id, 'items': [], 'status': 'error', 'error': str(e)}


def run_collection_task(task_id, tool_name, query, limit):
    """Run data collection in background thread."""
    tasks[task_id]['status'] = 'running'
    tasks[task_id]['startedAt'] = time.time()

    sources = SOURCE_CATEGORIES.get(tool_name, [])
    results = []
    total = len(sources)

    for i, source_id in enumerate(sources):
        tasks[task_id]['progress'] = int((i / total) * 100)
        tasks[task_id]['message'] = f"Querying {source_id}..."

        result = proxy_search(source_id, query, limit)
        results.append(result)

    tasks[task_id]['status'] = 'completed'
    tasks[task_id]['progress'] = 100
    tasks[task_id]['result'] = results
    tasks[task_id]['completedAt'] = time.time()


class MCPHandler(BaseHTTPRequestHandler):
    """Simple JSON-RPC 2.0 handler for MCP protocol."""

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        request = json.loads(body)

        method = request.get('method', '')
        params = request.get('params', {})
        req_id = request.get('id', 1)

        if method == 'initialize':
            self.send_json_rpc(req_id, {
                'protocolVersion': '2024-11-05',
                'capabilities': {'tools': {}, 'tasks': {}},
                'serverInfo': {'name': 'hic-research-data', 'version': '3.0.0'}
            })

        elif method == 'tools/list':
            self.send_json_rpc(req_id, {
                'tools': [
                    {'name': 'query_academic', 'description': 'Query academic databases (OpenAlex, Semantic Scholar, Crossref, arXiv, DOAJ)', 'inputSchema': {'type': 'object', 'properties': {'query': {'type': 'string'}, 'limit': {'type': 'integer', 'default': 15}}, 'required': ['query']}},
                    {'name': 'query_government', 'description': 'Query government databases (College Scorecard, Federal Register, Data.gov, FRED)', 'inputSchema': {'type': 'object', 'properties': {'query': {'type': 'string'}, 'limit': {'type': 'integer', 'default': 15}}, 'required': ['query']}},
                    {'name': 'query_news', 'description': 'Query news and media sources (GDELT, Higher Ed Dive, EdSurge, Hechinger Report)', 'inputSchema': {'type': 'object', 'properties': {'query': {'type': 'string'}, 'limit': {'type': 'integer', 'default': 15}}, 'required': ['query']}},
                    {'name': 'query_social', 'description': 'Query social/community sources (Reddit, TrustPilot, Play Store, Hacker News)', 'inputSchema': {'type': 'object', 'properties': {'query': {'type': 'string'}, 'limit': {'type': 'integer', 'default': 15}}, 'required': ['query']}},
                    {'name': 'query_ai_landscape', 'description': 'Query AI research sources (arXiv, HuggingFace, Papers with Code)', 'inputSchema': {'type': 'object', 'properties': {'query': {'type': 'string'}, 'limit': {'type': 'integer', 'default': 15}}, 'required': ['query']}},
                    {'name': 'get_collection_status', 'description': 'Check status of an async collection task', 'inputSchema': {'type': 'object', 'properties': {'taskId': {'type': 'string'}}, 'required': ['taskId']}},
                ]
            })

        elif method == 'tools/call':
            tool_name = params.get('name', '')
            arguments = params.get('arguments', {})

            if tool_name == 'get_collection_status':
                task_id = arguments.get('taskId', '')
                task = tasks.get(task_id)
                if task:
                    response = {'status': task['status'], 'progress': task.get('progress', 0), 'message': task.get('message', '')}
                    if task['status'] == 'completed':
                        response['result'] = task.get('result', [])
                    self.send_json_rpc(req_id, {'content': [{'type': 'text', 'text': json.dumps(response)}]})
                else:
                    self.send_json_rpc(req_id, {'content': [{'type': 'text', 'text': json.dumps({'status': 'not_found'})}]})

            elif tool_name in SOURCE_CATEGORIES:
                # Create async task
                task_id = str(uuid.uuid4())[:8]
                query = arguments.get('query', '')
                limit = arguments.get('limit', 15)

                tasks[task_id] = {
                    'id': task_id,
                    'tool': tool_name,
                    'status': 'submitted',
                    'progress': 0,
                    'message': 'Starting collection...',
                    'createdAt': time.time()
                }

                # Run in background thread
                thread = threading.Thread(target=run_collection_task, args=(task_id, tool_name, query, limit))
                thread.daemon = True
                thread.start()

                self.send_json_rpc(req_id, {
                    'content': [{'type': 'text', 'text': json.dumps({'taskId': task_id, 'status': 'submitted'})}]
                })
            else:
                self.send_json_rpc(req_id, {'content': [{'type': 'text', 'text': f'Unknown tool: {tool_name}'}]}, error={'code': -32601, 'message': f'Tool not found: {tool_name}'})

        else:
            self.send_json_rpc(req_id, None, error={'code': -32601, 'message': f'Method not found: {method}'})

    def send_json_rpc(self, req_id, result, error=None):
        response = {'jsonrpc': '2.0', 'id': req_id}
        if error:
            response['error'] = error
        else:
            response['result'] = result

        body = json.dumps(response).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        sys.stderr.write(f"[MCP] {format % args}\n")


def main():
    port = int(os.environ.get('MCP_PORT', 5020))
    server = HTTPServer(('0.0.0.0', port), MCPHandler)
    sys.stderr.write(f"[MCP] Research Data Server listening on port {port}\n")
    server.serve_forever()


if __name__ == '__main__':
    main()
