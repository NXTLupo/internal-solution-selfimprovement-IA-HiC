import type { FlowConfig, FlowParam, ToolConfig } from '../App'

interface Props {
  flows: FlowConfig[]
  tools: ToolConfig[]
  onFlowsChange: (flows: FlowConfig[]) => void
  onToolsChange: (tools: ToolConfig[]) => void
}

const TRIGGER_TYPES = [
  'When an agent calls the flow',
  'When a file is created (SharePoint)',
  'When an email arrives (Outlook)',
  'Scheduled (recurrence)',
  'When an HTTP request is received',
]

const FLOW_TYPES = ['Agent Flow', 'Cloud Flow']
const CALL_METHODS = ['Agent-level tool', 'Topic-level tool', 'Both']
const PARAM_TYPES = ['String', 'Number', 'Boolean']
const TOOL_TYPES = ['Flow', 'Connector', 'REST API', 'MCP', 'Prompt', 'Computer use']

export default function FlowDesigner({ flows, tools, onFlowsChange, onToolsChange }: Props) {
  // Flow management
  const addFlow = () => {
    onFlowsChange([...flows, {
      name: '',
      flow_type: 'Agent Flow',
      call_method: 'Agent-level tool',
      trigger_type: 'When an agent calls the flow',
      description: '',
      actions_description: '',
      use_async_pattern: false,
      input_params: [],
      output_params: [],
      http_endpoints: [],
    }])
  }

  const removeFlow = (index: number) => {
    onFlowsChange(flows.filter((_, i) => i !== index))
  }

  const updateFlow = (index: number, partial: Partial<FlowConfig>) => {
    onFlowsChange(flows.map((f, i) => (i === index ? { ...f, ...partial } : f)))
  }

  // Input/Output params
  const addParam = (flowIndex: number, paramType: 'input_params' | 'output_params') => {
    const flow = flows[flowIndex]
    const params = [...flow[paramType], { name: '', type: 'String' as const, description: '' }]
    updateFlow(flowIndex, { [paramType]: params })
  }

  const removeParam = (flowIndex: number, paramType: 'input_params' | 'output_params', paramIndex: number) => {
    const flow = flows[flowIndex]
    updateFlow(flowIndex, { [paramType]: flow[paramType].filter((_, i) => i !== paramIndex) })
  }

  const updateParam = (flowIndex: number, paramType: 'input_params' | 'output_params', paramIndex: number, partial: Partial<FlowParam>) => {
    const flow = flows[flowIndex]
    const params = flow[paramType].map((p, i) => (i === paramIndex ? { ...p, ...partial } : p))
    updateFlow(flowIndex, { [paramType]: params })
  }

  // Endpoints
  const addEndpoint = (flowIndex: number) => {
    const flow = flows[flowIndex]
    updateFlow(flowIndex, {
      http_endpoints: [...flow.http_endpoints, { method: 'POST', url: '', description: '' }],
    })
  }

  const removeEndpoint = (flowIndex: number, epIndex: number) => {
    const flow = flows[flowIndex]
    updateFlow(flowIndex, {
      http_endpoints: flow.http_endpoints.filter((_, i) => i !== epIndex),
    })
  }

  const updateEndpoint = (flowIndex: number, epIndex: number, partial: Partial<FlowConfig['http_endpoints'][0]>) => {
    const flow = flows[flowIndex]
    const endpoints = flow.http_endpoints.map((ep, i) => (i === epIndex ? { ...ep, ...partial } : ep))
    updateFlow(flowIndex, { http_endpoints: endpoints })
  }

  // Tool management
  const addTool = () => {
    onToolsChange([...tools, {
      tool_type: 'Flow',
      name: '',
      description: '',
      inputs: [],
      outputs: [],
      mcp_server_url: '',
      mcp_server_description: '',
      mcp_is_advanced_alternative: false,
    }])
  }

  const removeTool = (index: number) => {
    onToolsChange(tools.filter((_, i) => i !== index))
  }

  const updateTool = (index: number, partial: Partial<ToolConfig>) => {
    onToolsChange(tools.map((t, i) => (i === index ? { ...t, ...partial } : t)))
  }

  return (
    <div className="flow-designer">
      <h4><i className="fas fa-project-diagram"></i> Agent Flows & Power Automate Flows</h4>
      <p className="field-hint">
        <strong>Agent Flows</strong> are built in Copilot Studio (billed via Copilot Credits, no Power Automate license needed).
        <strong> Cloud Flows</strong> are built in Power Automate. Both can be called from agents as tools.
      </p>

      {flows.map((flow, fi) => (
        <div key={fi} className="flow-item">
          <div className="item-header">
            <span className="item-number">
              <i className={flow.flow_type === 'Agent Flow' ? 'fas fa-robot' : 'fas fa-bolt'}></i>
              {' '}Flow {fi + 1}
              <span className="flow-type-badge">{flow.flow_type}</span>
            </span>
            <button className="remove-btn" onClick={() => removeFlow(fi)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Flow Name</label>
              <input
                type="text"
                value={flow.name}
                onChange={(e) => updateFlow(fi, { name: e.target.value })}
                placeholder="e.g., Get Weather Forecast"
              />
            </div>
            <div className="form-group">
              <label>Flow Type</label>
              <select
                value={flow.flow_type}
                onChange={(e) => updateFlow(fi, { flow_type: e.target.value as FlowConfig['flow_type'] })}
              >
                {FLOW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>How Agent Calls This Flow</label>
              <select
                value={flow.call_method}
                onChange={(e) => updateFlow(fi, { call_method: e.target.value as FlowConfig['call_method'] })}
              >
                {CALL_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="field-hint">
                {flow.call_method === 'Agent-level tool' && 'Orchestrator decides when to call based on user intent'}
                {flow.call_method === 'Topic-level tool' && 'Explicit Action node in a topic with input/output variable mapping'}
                {flow.call_method === 'Both' && 'Available as orchestrator tool AND called explicitly from specific topics'}
              </span>
            </div>
            <div className="form-group flex-1">
              <label>Trigger</label>
              <select
                value={flow.trigger_type}
                onChange={(e) => updateFlow(fi, { trigger_type: e.target.value })}
              >
                {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description <span className="field-hint">(used for orchestrator routing -- be specific about when to call this flow)</span></label>
            <textarea
              value={flow.description}
              onChange={(e) => updateFlow(fi, { description: e.target.value })}
              placeholder="e.g., Get today's weather forecast at a provided city name or zip code"
              rows={2}
            />
          </div>

          {/* Input Parameters */}
          <div className="params-section">
            <label><i className="fas fa-sign-in-alt"></i> Input Parameters <span className="field-hint">(String, Number, Boolean only)</span></label>
            {flow.input_params.map((p, pi) => (
              <div key={pi} className="param-row">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateParam(fi, 'input_params', pi, { name: e.target.value })}
                  placeholder="Parameter name"
                  className="flex-1"
                />
                <select
                  value={p.type}
                  onChange={(e) => updateParam(fi, 'input_params', pi, { type: e.target.value as FlowParam['type'] })}
                  className="param-type-select"
                >
                  {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="text"
                  value={p.description || ''}
                  onChange={(e) => updateParam(fi, 'input_params', pi, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="flex-1"
                />
                <button className="remove-btn small" onClick={() => removeParam(fi, 'input_params', pi)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
            <button className="add-btn small" onClick={() => addParam(fi, 'input_params')}>
              <i className="fas fa-plus"></i> Add Input
            </button>
          </div>

          {/* Output Parameters */}
          <div className="params-section">
            <label><i className="fas fa-sign-out-alt"></i> Output Parameters <span className="field-hint">(returned to agent via Respond to agent action)</span></label>
            {flow.output_params.map((p, pi) => (
              <div key={pi} className="param-row">
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => updateParam(fi, 'output_params', pi, { name: e.target.value })}
                  placeholder="Parameter name"
                  className="flex-1"
                />
                <select
                  value={p.type}
                  onChange={(e) => updateParam(fi, 'output_params', pi, { type: e.target.value as FlowParam['type'] })}
                  className="param-type-select"
                >
                  {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="text"
                  value={p.description || ''}
                  onChange={(e) => updateParam(fi, 'output_params', pi, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="flex-1"
                />
                <button className="remove-btn small" onClick={() => removeParam(fi, 'output_params', pi)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
            <button className="add-btn small" onClick={() => addParam(fi, 'output_params')}>
              <i className="fas fa-plus"></i> Add Output
            </button>
          </div>

          <div className="form-group">
            <label>Action Stack Description</label>
            <textarea
              value={flow.actions_description}
              onChange={(e) => updateFlow(fi, { actions_description: e.target.value })}
              placeholder="Describe the key actions: e.g., Initialize variable -> Get environment variable -> HTTP POST to API -> Parse JSON -> Set variable -> Respond to agent"
              rows={3}
            />
          </div>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={flow.use_async_pattern}
              onChange={(e) => updateFlow(fi, { use_async_pattern: e.target.checked })}
            />
            <span>Use async respond pattern (Respond to agent first, then long-running actions up to 30 days)</span>
          </label>

          {/* HTTP Endpoints */}
          <div className="endpoints-section">
            <label>HTTP Endpoints</label>
            {flow.http_endpoints.map((ep, ei) => (
              <div key={ei} className="endpoint-row">
                <select
                  value={ep.method}
                  onChange={(e) => updateEndpoint(fi, ei, { method: e.target.value })}
                  className="method-select"
                >
                  <option>POST</option>
                  <option>GET</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <input
                  type="text"
                  value={ep.url}
                  onChange={(e) => updateEndpoint(fi, ei, { url: e.target.value })}
                  placeholder="https://api.example.com/v1/endpoint"
                  className="flex-1"
                />
                <input
                  type="text"
                  value={ep.description}
                  onChange={(e) => updateEndpoint(fi, ei, { description: e.target.value })}
                  placeholder="Description"
                  className="flex-1"
                />
                <button className="remove-btn small" onClick={() => removeEndpoint(fi, ei)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
            <button className="add-btn small" onClick={() => addEndpoint(fi)}>
              <i className="fas fa-plus"></i> Add Endpoint
            </button>
          </div>
        </div>
      ))}

      <button className="add-btn" onClick={addFlow}>
        <i className="fas fa-plus"></i> Add Flow
      </button>

      <hr className="section-divider" />

      <h4><i className="fas fa-tools"></i> Additional Tools</h4>
      <p className="field-hint">
        Add connectors, REST APIs, MCP servers, or prompts beyond the flows above.
        <strong> MCP servers</strong> enable dynamic tool discovery but are in preview -- Agent Flows are recommended for beginners.
      </p>

      {tools.map((tool, ti) => (
        <div key={ti} className={`tool-item${tool.tool_type === 'MCP' ? ' mcp-tool' : ''}`}>
          <div className="item-header">
            <span className="item-number">
              <i className={tool.tool_type === 'MCP' ? 'fas fa-plug' : 'fas fa-wrench'}></i>
              {' '}Tool {ti + 1}
              {tool.tool_type === 'MCP' && <span className="mcp-badge">MCP</span>}
            </span>
            <button className="remove-btn" onClick={() => removeTool(ti)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select
                value={tool.tool_type}
                onChange={(e) => updateTool(ti, { tool_type: e.target.value })}
              >
                {TOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group flex-1">
              <label>Name</label>
              <input
                type="text"
                value={tool.name}
                onChange={(e) => updateTool(ti, { name: e.target.value })}
                placeholder={tool.tool_type === 'MCP' ? 'e.g., social_analytics_server' : 'e.g., SharePoint connector'}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={tool.description}
              onChange={(e) => updateTool(ti, { description: e.target.value })}
              placeholder={tool.tool_type === 'MCP'
                ? 'What tools does this MCP server expose? (Note: descriptions are server-defined in Copilot Studio)'
                : 'What does this tool do?'}
              rows={2}
            />
          </div>

          {/* MCP-specific fields */}
          {tool.tool_type === 'MCP' && (
            <div className="mcp-config-section">
              <div className="mcp-config-header">
                <i className="fas fa-server"></i> MCP Server Configuration
                <span className="preview-badge">Preview</span>
              </div>
              <div className="form-group">
                <label>MCP Server URL <span className="field-hint">(must be publicly accessible HTTPS)</span></label>
                <input
                  type="text"
                  value={tool.mcp_server_url || ''}
                  onChange={(e) => updateTool(ti, { mcp_server_url: e.target.value })}
                  placeholder="https://my-mcp-server.azurewebsites.net/mcp"
                />
              </div>
              <div className="form-group">
                <label>Server Description <span className="field-hint">(what this MCP server provides)</span></label>
                <textarea
                  value={tool.mcp_server_description || ''}
                  onChange={(e) => updateTool(ti, { mcp_server_description: e.target.value })}
                  placeholder="e.g., Social analytics MCP server providing topic modeling, sentiment analysis, and semantic search tools via BERTopic, VADER, and pgvector"
                  rows={2}
                />
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={tool.mcp_is_advanced_alternative || false}
                  onChange={(e) => updateTool(ti, { mcp_is_advanced_alternative: e.target.checked })}
                />
                <span>This is an advanced alternative -- the recipe should also document the simpler Agent Flow approach</span>
              </label>
              <div className="mcp-warning">
                <i className="fas fa-exclamation-triangle"></i>
                <span>MCP in Copilot Studio is in <strong>preview</strong>. Tool descriptions are server-defined (makers cannot edit them). Governance is whole-server (all tools or none). For beginners, Agent Flows with HTTP connectors are recommended.</span>
              </div>
            </div>
          )}
        </div>
      ))}

      <button className="add-btn" onClick={addTool}>
        <i className="fas fa-plus"></i> Add Tool
      </button>
    </div>
  )
}
