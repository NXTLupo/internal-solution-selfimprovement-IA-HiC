import { useState } from 'react'
import type { TopicConfig, TopicNode, FlowConfig, FlowParam, ToolConfig } from '../App'
import { generateTopicYaml } from '../services/api'

interface Props {
  topics: TopicConfig[]
  flows: FlowConfig[]
  tools: ToolConfig[]
  onTopicsChange: (topics: TopicConfig[]) => void
  onFlowsChange: (flows: FlowConfig[]) => void
  onToolsChange: (tools: ToolConfig[]) => void
}

interface YamlPreview {
  topicIndex: number
  yaml: string
  loading: boolean
  error: string
}

// ─── Constants ───

const NODE_TYPES: TopicNode['type'][] = [
  'Message', 'Question', 'Action', 'Condition', 'Redirect', 'Adaptive Card'
]

const ACTION_SUBTYPES = [
  'Call a flow', 'HTTP request', 'Set variable value',
  'Parse value', 'Send Adaptive Card', 'Send email notification',
]

const NODE_TYPE_ICONS: Record<string, string> = {
  'Message': 'fas fa-comment-dots',
  'Question': 'fas fa-question-circle',
  'Action': 'fas fa-bolt',
  'Condition': 'fas fa-code-branch',
  'Redirect': 'fas fa-share',
  'Adaptive Card': 'fas fa-id-card',
}

const NODE_TYPE_COLORS: Record<string, string> = {
  'Message': '#3B82F6',
  'Question': '#8B5CF6',
  'Action': '#F59E0B',
  'Condition': '#EF4444',
  'Redirect': '#10B981',
  'Adaptive Card': '#EC4899',
}

const FLOW_TYPES = ['Agent Flow', 'Cloud Flow']
const CALL_METHODS = ['Agent-level tool', 'Topic-level tool', 'Both']
const FLOW_TRIGGER_TYPES = [
  'When an agent calls the flow',
  'When a file is created (SharePoint)',
  'When an email arrives (Outlook)',
  'Scheduled (recurrence)',
  'When an HTTP request is received',
]
const PARAM_TYPES = ['String', 'Number', 'Boolean']
const TOOL_TYPES = ['Flow', 'Connector', 'REST API', 'MCP', 'Prompt', 'Computer use']

// ─── Helpers ───

function getReferencedFlowNames(topic: TopicConfig): string[] {
  return topic.nodes
    .filter(n => n.type === 'Action' && (n.action_type === 'Call a flow' || !n.action_type) && n.flow_name)
    .map(n => n.flow_name!)
}

// ─── Component ───

export default function CapabilityEditor({
  topics, flows, tools,
  onTopicsChange, onFlowsChange, onToolsChange,
}: Props) {
  const [expandedCaps, setExpandedCaps] = useState<Set<number>>(new Set([0]))
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set())
  const [yamlPreview, setYamlPreview] = useState<YamlPreview | null>(null)

  // ─── Compute capability groupings ───
  const assignedFlowIndices = new Set<number>()
  const capabilities = topics.map((topic, ti) => {
    const refNames = getReferencedFlowNames(topic)
    const flowIndices: number[] = []
    const capFlows: FlowConfig[] = []
    for (const name of refNames) {
      const fi = flows.findIndex((f, i) => f.name === name && !assignedFlowIndices.has(i))
      if (fi !== -1) {
        assignedFlowIndices.add(fi)
        flowIndices.push(fi)
        capFlows.push(flows[fi])
      }
    }
    return { topicIndex: ti, topic, flowIndices, flows: capFlows }
  })

  const unassociatedFlows = flows
    .map((f, i) => ({ flow: f, index: i }))
    .filter(({ index }) => !assignedFlowIndices.has(index))

  // ─── Toggle helpers ───
  const toggleCap = (i: number) => {
    const next = new Set(expandedCaps)
    next.has(i) ? next.delete(i) : next.add(i)
    setExpandedCaps(next)
  }

  const toggleNode = (ti: number, ni: number) => {
    const key = `${ti}-${ni}`
    const next = new Set(expandedNodes)
    next.has(key) ? next.delete(key) : next.add(key)
    setExpandedNodes(next)
  }

  const toggleFlow = (fi: number) => {
    const key = `f-${fi}`
    const next = new Set(expandedFlows)
    next.has(key) ? next.delete(key) : next.add(key)
    setExpandedFlows(next)
  }

  // ─── Topic CRUD ───
  const updateTopic = (ti: number, partial: Partial<TopicConfig>) => {
    onTopicsChange(topics.map((t, i) => i === ti ? { ...t, ...partial } : t))
  }

  const removeCapability = (ti: number) => {
    onTopicsChange(topics.filter((_, i) => i !== ti))
    const next = new Set(expandedCaps)
    next.delete(ti)
    setExpandedCaps(next)
  }

  const addCapability = () => {
    onTopicsChange([...topics, { name: '', description: '', nodes: [] }])
    setExpandedCaps(new Set([...expandedCaps, topics.length]))
  }

  // ─── Node CRUD ───
  const addNode = (ti: number) => {
    const topic = topics[ti]
    updateTopic(ti, { nodes: [...topic.nodes, { type: 'Message', name: '', description: '' }] })
    setExpandedNodes(new Set([...expandedNodes, `${ti}-${topic.nodes.length}`]))
  }

  const removeNode = (ti: number, ni: number) => {
    updateTopic(ti, { nodes: topics[ti].nodes.filter((_, i) => i !== ni) })
  }

  const updateNode = (ti: number, ni: number, partial: Partial<TopicNode>) => {
    updateTopic(ti, { nodes: topics[ti].nodes.map((n, i) => i === ni ? { ...n, ...partial } : n) })
  }

  const moveNode = (ti: number, ni: number, dir: -1 | 1) => {
    const nodes = [...topics[ti].nodes]
    const newIdx = ni + dir
    if (newIdx < 0 || newIdx >= nodes.length) return
    ;[nodes[ni], nodes[newIdx]] = [nodes[newIdx], nodes[ni]]
    updateTopic(ti, { nodes })
  }

  // ─── Flow CRUD ───
  const updateFlow = (fi: number, partial: Partial<FlowConfig>) => {
    onFlowsChange(flows.map((f, i) => i === fi ? { ...f, ...partial } : f))
  }

  const removeFlow = (fi: number) => {
    onFlowsChange(flows.filter((_, i) => i !== fi))
  }

  const addFlowToCapability = (ti: number) => {
    const topic = topics[ti]
    const flowName = topic.name ? `${topic.name} Flow` : 'New Flow'
    // Add the new flow
    onFlowsChange([...flows, {
      name: flowName,
      flow_type: 'Agent Flow',
      call_method: 'Topic-level tool',
      trigger_type: 'When an agent calls the flow',
      description: '',
      actions_description: '',
      use_async_pattern: false,
      input_params: [],
      output_params: [],
      http_endpoints: [],
    }])
    // Add an Action node linking topic to the new flow
    updateTopic(ti, {
      nodes: [...topic.nodes, {
        type: 'Action' as const,
        name: `Call ${flowName}`,
        description: `Calls the ${flowName} with input parameters`,
        action_type: 'Call a flow',
        flow_name: flowName,
      }],
    })
  }

  const addStandaloneFlow = () => {
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

  // ─── Param CRUD ───
  const addParam = (fi: number, pt: 'input_params' | 'output_params') => {
    updateFlow(fi, { [pt]: [...flows[fi][pt], { name: '', type: 'String', description: '' }] })
  }

  const removeParam = (fi: number, pt: 'input_params' | 'output_params', pi: number) => {
    updateFlow(fi, { [pt]: flows[fi][pt].filter((_: FlowParam, i: number) => i !== pi) })
  }

  const updateParam = (fi: number, pt: 'input_params' | 'output_params', pi: number, partial: Partial<FlowParam>) => {
    updateFlow(fi, { [pt]: flows[fi][pt].map((p: FlowParam, i: number) => i === pi ? { ...p, ...partial } : p) })
  }

  // ─── Endpoint CRUD ───
  const addEndpoint = (fi: number) => {
    updateFlow(fi, { http_endpoints: [...flows[fi].http_endpoints, { method: 'POST', url: '', description: '' }] })
  }

  const removeEndpoint = (fi: number, ei: number) => {
    updateFlow(fi, { http_endpoints: flows[fi].http_endpoints.filter((_: any, i: number) => i !== ei) })
  }

  const updateEndpoint = (fi: number, ei: number, partial: Partial<FlowConfig['http_endpoints'][0]>) => {
    updateFlow(fi, { http_endpoints: flows[fi].http_endpoints.map((ep: any, i: number) => i === ei ? { ...ep, ...partial } : ep) })
  }

  // ─── Tool CRUD ───
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

  const removeTool = (ti: number) => {
    onToolsChange(tools.filter((_, i) => i !== ti))
  }

  const updateToolItem = (ti: number, partial: Partial<ToolConfig>) => {
    onToolsChange(tools.map((t, i) => i === ti ? { ...t, ...partial } : t))
  }

  // ─── YAML generation ───
  const handleGenerateYaml = async (ti: number) => {
    const topic = topics[ti]
    if (!topic.name) return
    setYamlPreview({ topicIndex: ti, yaml: '', loading: true, error: '' })
    try {
      const result = await generateTopicYaml(topic)
      setYamlPreview({ topicIndex: ti, yaml: result.yaml, loading: false, error: '' })
    } catch (e: any) {
      setYamlPreview({ topicIndex: ti, yaml: '', loading: false, error: e.message || 'Failed to generate YAML' })
    }
  }

  // ─── Render: Node Builder ───
  const renderNodeBuilder = (ti: number, nodes: TopicNode[]) => (
    <div className="node-flow-section">
      <div className="node-flow-header">
        <h5><i className="fas fa-project-diagram"></i> Topic Flow -- Nodes</h5>
        <span className="field-hint">Add nodes in the order they appear in the conversation flow</span>
      </div>

      {nodes.length === 0 && (
        <div className="node-flow-empty">
          <i className="fas fa-plus-circle"></i>
          <p>No nodes yet. Add nodes to define this topic's conversation flow.</p>
          <p className="field-hint">Common pattern: Message, Question, Action (Call Flow), Condition, Message/Adaptive Card</p>
        </div>
      )}

      <div className="node-flow-list">
        {nodes.map((node, ni) => {
          const nodeKey = `${ti}-${ni}`
          const isExpanded = expandedNodes.has(nodeKey)
          const color = NODE_TYPE_COLORS[node.type] || '#888'
          const icon = NODE_TYPE_ICONS[node.type] || 'fas fa-circle'

          return (
            <div key={ni} className="node-flow-item">
              {ni > 0 && <div className="node-connector"><div className="connector-line"></div></div>}
              <div className="node-card" style={{ borderLeftColor: color }}>
                <div className="node-card-header" onClick={() => toggleNode(ti, ni)}>
                  <div className="node-card-left">
                    <i className={`${icon} node-type-icon`} style={{ color }}></i>
                    <span className="node-type-label" style={{ color }}>{node.type}</span>
                    {node.name && <span className="node-name-label">"{node.name}"</span>}
                    {node.variable_name && (
                      <span className="node-var-badge">
                        <i className="fas fa-database"></i> {node.variable_scope === 'Global' ? 'Global.' : ''}{node.variable_name}
                      </span>
                    )}
                  </div>
                  <div className="node-card-actions">
                    <button className="node-move-btn" onClick={(e) => { e.stopPropagation(); moveNode(ti, ni, -1) }} disabled={ni === 0} title="Move up">
                      <i className="fas fa-arrow-up"></i>
                    </button>
                    <button className="node-move-btn" onClick={(e) => { e.stopPropagation(); moveNode(ti, ni, 1) }} disabled={ni === nodes.length - 1} title="Move down">
                      <i className="fas fa-arrow-down"></i>
                    </button>
                    <button className="remove-btn small" onClick={(e) => { e.stopPropagation(); removeNode(ti, ni) }} title="Remove node">
                      <i className="fas fa-times"></i>
                    </button>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} node-expand-icon`}></i>
                  </div>
                </div>

                {isExpanded && (
                  <div className="node-card-body">
                    <div className="node-form-row">
                      <div className="form-group flex-1">
                        <label>Node Type</label>
                        <select value={node.type} onChange={(e) => updateNode(ti, ni, { type: e.target.value as TopicNode['type'] })}>
                          {NODE_TYPES.map(nt => <option key={nt} value={nt}>{nt}</option>)}
                        </select>
                      </div>
                      <div className="form-group flex-2">
                        <label>Node Name <span className="field-hint">(as it appears in Copilot Studio)</span></label>
                        <input
                          type="text"
                          value={node.name}
                          onChange={(e) => updateNode(ti, ni, { name: e.target.value })}
                          placeholder={
                            node.type === 'Message' ? 'e.g., Welcome Message, Show Results' :
                            node.type === 'Question' ? 'e.g., Ask Platform Choice, Ask Topic' :
                            node.type === 'Action' ? 'e.g., Call Research Flow, Set Status Variable' :
                            node.type === 'Condition' ? 'e.g., Check if Async, Validate Input' :
                            node.type === 'Redirect' ? 'e.g., Go to Status Check' :
                            'e.g., Show Results Card'
                          }
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>What this node does</label>
                      <textarea
                        value={node.description}
                        onChange={(e) => updateNode(ti, ni, { description: e.target.value })}
                        placeholder={
                          node.type === 'Message' ? 'What message does this node display to the user?' :
                          node.type === 'Question' ? 'What question does this node ask?' :
                          node.type === 'Action' ? 'What action does this node perform?' :
                          node.type === 'Condition' ? 'What condition does this check?' :
                          node.type === 'Redirect' ? 'Which topic does this redirect to?' :
                          'Describe the Adaptive Card this node shows'
                        }
                        rows={2}
                      />
                    </div>

                    {/* Variable fields -- Question, Action, Condition */}
                    {(node.type === 'Question' || node.type === 'Action' || node.type === 'Condition') && (
                      <div className="node-variable-section">
                        <div className="node-form-row">
                          <div className="form-group flex-1">
                            <label>
                              {node.type === 'Question' ? 'Saves answer to variable' :
                               node.type === 'Action' ? 'Key variable set/used' :
                               'Condition checks variable'}
                            </label>
                            <input
                              type="text"
                              value={node.variable_name || ''}
                              onChange={(e) => updateNode(ti, ni, { variable_name: e.target.value })}
                              placeholder="e.g., varPlatformChoice, varJobId, varResultStatus"
                              className="mono-input"
                            />
                          </div>
                          <div className="form-group" style={{ width: '140px' }}>
                            <label>Scope</label>
                            <select
                              value={node.variable_scope || 'Topic'}
                              onChange={(e) => updateNode(ti, ni, { variable_scope: e.target.value as 'Topic' | 'Global' })}
                            >
                              <option value="Topic">Topic</option>
                              <option value="Global">Global</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action-specific fields */}
                    {node.type === 'Action' && (
                      <div className="node-form-row">
                        <div className="form-group flex-1">
                          <label>Action Type</label>
                          <select
                            value={node.action_type || 'Call a flow'}
                            onChange={(e) => updateNode(ti, ni, { action_type: e.target.value })}
                          >
                            {ACTION_SUBTYPES.map(at => <option key={at} value={at}>{at}</option>)}
                          </select>
                        </div>
                        {(node.action_type === 'Call a flow' || !node.action_type) && (
                          <div className="form-group flex-1">
                            <label>Flow Name <span className="field-hint">(links to a flow below)</span></label>
                            <input
                              type="text"
                              value={node.flow_name || ''}
                              onChange={(e) => updateNode(ti, ni, { flow_name: e.target.value })}
                              placeholder="e.g., Run Data Collection, Generate Report"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Condition-specific */}
                    {node.type === 'Condition' && (
                      <div className="form-group">
                        <label>Condition Expression <span className="field-hint">(Power Fx or comparison)</span></label>
                        <input
                          type="text"
                          value={node.condition_expression || ''}
                          onChange={(e) => updateNode(ti, ni, { condition_expression: e.target.value })}
                          placeholder='e.g., Topic.varStatus = "success", length(Topic.varResults) > 0'
                          className="mono-input"
                        />
                      </div>
                    )}

                    {/* Redirect-specific */}
                    {node.type === 'Redirect' && (
                      <div className="form-group">
                        <label>Redirect to Topic</label>
                        <input
                          type="text"
                          value={node.redirect_topic || ''}
                          onChange={(e) => updateNode(ti, ni, { redirect_topic: e.target.value })}
                          placeholder="e.g., Export Results, Escalate to Agent, End of Conversation"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button className="add-btn node-add-btn" onClick={() => addNode(ti)}>
        <i className="fas fa-plus"></i> Add Node
      </button>
    </div>
  )

  // ─── Render: Flow Form ───
  const renderFlowForm = (fi: number, flow: FlowConfig) => {
    const isExpanded = expandedFlows.has(`f-${fi}`)
    return (
      <div key={fi} className="flow-item cap-flow-item">
        <div className="item-header cap-flow-header" onClick={() => toggleFlow(fi)} style={{ cursor: 'pointer' }}>
          <span className="item-number">
            <i className={flow.flow_type === 'Agent Flow' ? 'fas fa-robot' : 'fas fa-bolt'}></i>
            {' '}{flow.name || 'Unnamed Flow'}
            <span className="flow-type-badge">{flow.flow_type}</span>
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeFlow(fi) }}>
              <i className="fas fa-trash"></i>
            </button>
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: '#888', fontSize: '0.75rem' }}></i>
          </div>
        </div>

        {isExpanded && (
          <div className="cap-flow-body">
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Flow Name</label>
                <input type="text" value={flow.name} onChange={(e) => updateFlow(fi, { name: e.target.value })} placeholder="e.g., Get Weather Forecast" />
              </div>
              <div className="form-group">
                <label>Flow Type</label>
                <select value={flow.flow_type} onChange={(e) => updateFlow(fi, { flow_type: e.target.value as FlowConfig['flow_type'] })}>
                  {FLOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>How Agent Calls This Flow</label>
                <select value={flow.call_method} onChange={(e) => updateFlow(fi, { call_method: e.target.value as FlowConfig['call_method'] })}>
                  {CALL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="field-hint">
                  {flow.call_method === 'Agent-level tool' && 'Orchestrator decides when to call based on user intent'}
                  {flow.call_method === 'Topic-level tool' && 'Explicit Action node in a topic with input/output variable mapping'}
                  {flow.call_method === 'Both' && 'Available as orchestrator tool AND called explicitly from specific topics'}
                </span>
              </div>
              <div className="form-group flex-1">
                <label>Trigger</label>
                <select value={flow.trigger_type} onChange={(e) => updateFlow(fi, { trigger_type: e.target.value })}>
                  {FLOW_TRIGGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description <span className="field-hint">(used for orchestrator routing -- be specific)</span></label>
              <textarea value={flow.description} onChange={(e) => updateFlow(fi, { description: e.target.value })} placeholder="When to call this flow and what it does" rows={2} />
            </div>

            {/* Input Parameters */}
            <div className="params-section">
              <label><i className="fas fa-sign-in-alt"></i> Input Parameters <span className="field-hint">(String, Number, Boolean only)</span></label>
              {flow.input_params.map((p, pi) => (
                <div key={pi} className="param-row">
                  <input type="text" value={p.name} onChange={(e) => updateParam(fi, 'input_params', pi, { name: e.target.value })} placeholder="Parameter name" className="flex-1" />
                  <select value={p.type} onChange={(e) => updateParam(fi, 'input_params', pi, { type: e.target.value as FlowParam['type'] })} className="param-type-select">
                    {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" value={p.description || ''} onChange={(e) => updateParam(fi, 'input_params', pi, { description: e.target.value })} placeholder="Description (optional)" className="flex-1" />
                  <button className="remove-btn small" onClick={() => removeParam(fi, 'input_params', pi)}><i className="fas fa-times"></i></button>
                </div>
              ))}
              <button className="add-btn small" onClick={() => addParam(fi, 'input_params')}><i className="fas fa-plus"></i> Add Input</button>
            </div>

            {/* Output Parameters */}
            <div className="params-section">
              <label><i className="fas fa-sign-out-alt"></i> Output Parameters <span className="field-hint">(returned via Respond to agent)</span></label>
              {flow.output_params.map((p, pi) => (
                <div key={pi} className="param-row">
                  <input type="text" value={p.name} onChange={(e) => updateParam(fi, 'output_params', pi, { name: e.target.value })} placeholder="Parameter name" className="flex-1" />
                  <select value={p.type} onChange={(e) => updateParam(fi, 'output_params', pi, { type: e.target.value as FlowParam['type'] })} className="param-type-select">
                    {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" value={p.description || ''} onChange={(e) => updateParam(fi, 'output_params', pi, { description: e.target.value })} placeholder="Description (optional)" className="flex-1" />
                  <button className="remove-btn small" onClick={() => removeParam(fi, 'output_params', pi)}><i className="fas fa-times"></i></button>
                </div>
              ))}
              <button className="add-btn small" onClick={() => addParam(fi, 'output_params')}><i className="fas fa-plus"></i> Add Output</button>
            </div>

            <div className="form-group">
              <label>Action Stack Description</label>
              <textarea value={flow.actions_description} onChange={(e) => updateFlow(fi, { actions_description: e.target.value })} placeholder="Describe the key actions: e.g., Initialize variable -> Get environment variable -> HTTP POST to API -> Parse JSON -> Set variable -> Respond to agent" rows={3} />
            </div>

            <label className="toggle-label">
              <input type="checkbox" checked={flow.use_async_pattern} onChange={(e) => updateFlow(fi, { use_async_pattern: e.target.checked })} />
              <span>Use async respond pattern (Respond to agent first, then long-running actions up to 30 days)</span>
            </label>

            {/* HTTP Endpoints */}
            <div className="endpoints-section">
              <label>HTTP Endpoints</label>
              {flow.http_endpoints.map((ep, ei) => (
                <div key={ei} className="endpoint-row">
                  <select value={ep.method} onChange={(e) => updateEndpoint(fi, ei, { method: e.target.value })} className="method-select">
                    <option>POST</option><option>GET</option><option>PUT</option><option>DELETE</option>
                  </select>
                  <input type="text" value={ep.url} onChange={(e) => updateEndpoint(fi, ei, { url: e.target.value })} placeholder="https://api.example.com/v1/endpoint" className="flex-1" />
                  <input type="text" value={ep.description} onChange={(e) => updateEndpoint(fi, ei, { description: e.target.value })} placeholder="Description" className="flex-1" />
                  <button className="remove-btn small" onClick={() => removeEndpoint(fi, ei)}><i className="fas fa-times"></i></button>
                </div>
              ))}
              <button className="add-btn small" onClick={() => addEndpoint(fi)}><i className="fas fa-plus"></i> Add Endpoint</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Tool Form ───
  const renderToolForm = (ti: number, tool: ToolConfig) => (
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
          <select value={tool.tool_type} onChange={(e) => updateToolItem(ti, { tool_type: e.target.value })}>
            {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group flex-1">
          <label>Name</label>
          <input type="text" value={tool.name} onChange={(e) => updateToolItem(ti, { name: e.target.value })} placeholder={tool.tool_type === 'MCP' ? 'e.g., social_analytics_server' : 'e.g., SharePoint connector'} />
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea value={tool.description} onChange={(e) => updateToolItem(ti, { description: e.target.value })} placeholder={tool.tool_type === 'MCP' ? 'What tools does this MCP server expose?' : 'What does this tool do?'} rows={2} />
      </div>

      {tool.tool_type === 'MCP' && (
        <div className="mcp-config-section">
          <div className="mcp-config-header">
            <i className="fas fa-server"></i> MCP Server Configuration
            <span className="preview-badge">Preview</span>
          </div>
          <div className="form-group">
            <label>MCP Server URL <span className="field-hint">(must be publicly accessible HTTPS)</span></label>
            <input type="text" value={tool.mcp_server_url || ''} onChange={(e) => updateToolItem(ti, { mcp_server_url: e.target.value })} placeholder="https://my-mcp-server.azurewebsites.net/mcp" />
          </div>
          <div className="form-group">
            <label>Server Description <span className="field-hint">(what this MCP server provides)</span></label>
            <textarea value={tool.mcp_server_description || ''} onChange={(e) => updateToolItem(ti, { mcp_server_description: e.target.value })} placeholder="e.g., Social analytics MCP server providing topic modeling, sentiment analysis, and semantic search tools" rows={2} />
          </div>
          <label className="toggle-label">
            <input type="checkbox" checked={tool.mcp_is_advanced_alternative || false} onChange={(e) => updateToolItem(ti, { mcp_is_advanced_alternative: e.target.checked })} />
            <span>This is an advanced alternative -- the recipe should also document the simpler Agent Flow approach</span>
          </label>
          <div className="mcp-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <span>MCP in Copilot Studio is in <strong>preview</strong>. Tool descriptions are server-defined. For beginners, Agent Flows with HTTP connectors are recommended.</span>
          </div>
        </div>
      )}
    </div>
  )

  // ─── Main render ───
  return (
    <div className="capability-editor">
      <div className="capability-intro">
        <i className="fas fa-info-circle"></i>
        <span>
          Define each <strong>capability</strong> your agent provides.
          Each capability groups a <strong>topic</strong> (conversation path) with its <strong>associated flows</strong> (Power Automate flows it calls).
          This mirrors how the recipe builds them: topic first, then its flows, then tool registration -- all together.
        </span>
      </div>

      {/* ─── Capability cards ─── */}
      {capabilities.map((cap, ci) => {
        const isExpanded = expandedCaps.has(ci)
        const nodeCount = cap.topic.nodes.length
        const flowCount = cap.flows.length

        return (
          <div key={ci} className="capability-card">
            {/* Header */}
            <div className="capability-header" onClick={() => toggleCap(ci)}>
              <div className="capability-header-left">
                <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} cap-chevron`}></i>
                <span className="capability-number">Capability {ci + 1}</span>
                {cap.topic.name && <span className="capability-name">-- {cap.topic.name}</span>}
              </div>
              <div className="capability-header-right">
                <span className="cap-badge"><i className="fas fa-list-ol"></i> {nodeCount} node{nodeCount !== 1 ? 's' : ''}</span>
                <span className="cap-badge"><i className="fas fa-project-diagram"></i> {flowCount} flow{flowCount !== 1 ? 's' : ''}</span>
                <button
                  className="yaml-btn"
                  onClick={(e) => { e.stopPropagation(); handleGenerateYaml(ci) }}
                  title="Generate YAML for Copilot Studio code editor"
                  disabled={!cap.topic.name}
                >
                  <i className="fas fa-code"></i> YAML
                </button>
                <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeCapability(ci) }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>

            {/* Collapsed summary */}
            {!isExpanded && (
              <div className="capability-collapsed">
                <span className="collapsed-desc">{cap.topic.description?.slice(0, 120) || 'No description'}{(cap.topic.description?.length || 0) > 120 ? '...' : ''}</span>
                {flowCount > 0 && <span className="collapsed-flows">Flows: {cap.flows.map(f => f.name).join(', ')}</span>}
              </div>
            )}

            {/* Expanded body */}
            {isExpanded && (
              <div className="capability-body">
                {/* ── TOPIC SECTION ── */}
                <div className="capability-section">
                  <div className="capability-section-header">
                    <i className="fas fa-comments" style={{ color: '#3B82F6' }}></i> Topic Definition
                  </div>

                  <div className="form-group">
                    <label>Topic Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={cap.topic.name}
                      onChange={(e) => updateTopic(ci, { name: e.target.value })}
                      placeholder="e.g., Research Request, Data Collection, Status Check"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description <span className="field-hint">(orchestrator reads this to decide routing -- be specific)</span></label>
                    <textarea
                      value={cap.topic.description}
                      onChange={(e) => updateTopic(ci, { description: e.target.value })}
                      placeholder="Describe WHEN this topic should activate. Example: 'User wants to start a new research analysis. Route here when the user mentions researching, analyzing, investigating a topic, industry, or competitor.'"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>Trigger Phrases <span className="field-hint">(comma-separated phrases that activate this topic)</span></label>
                    <input
                      type="text"
                      value={cap.topic.trigger_phrases || ''}
                      onChange={(e) => updateTopic(ci, { trigger_phrases: e.target.value })}
                      placeholder="e.g., research, analyze, investigate, study, explore"
                    />
                  </div>

                  {renderNodeBuilder(ci, cap.topic.nodes)}
                </div>

                {/* ── FLOWS SECTION ── */}
                <div className="capability-section">
                  <div className="capability-section-header">
                    <i className="fas fa-project-diagram" style={{ color: '#F59E0B' }}></i> Connected Flows ({flowCount})
                    <span className="field-hint" style={{ marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      Flows referenced by Action nodes above
                    </span>
                  </div>

                  {cap.flows.length === 0 && (
                    <div className="capability-empty-flows">
                      <p>No flows connected yet. Add a flow below, or create an Action node with "Call a flow" in the topic above.</p>
                    </div>
                  )}

                  {cap.flowIndices.map((fi) => renderFlowForm(fi, flows[fi]))}

                  <button className="add-btn small" onClick={() => addFlowToCapability(ci)}>
                    <i className="fas fa-plus"></i> Add Flow to this Capability
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button className="add-btn" onClick={addCapability}>
        <i className="fas fa-plus"></i> Add Capability
      </button>

      {/* ─── Standalone Flows ─── */}
      {unassociatedFlows.length > 0 && (
        <div className="standalone-section">
          <h4><i className="fas fa-stream"></i> Standalone Flows ({unassociatedFlows.length})</h4>
          <p className="field-hint">Flows not linked to any topic's Action node. They may be called directly by the orchestrator or other triggers.</p>
          {unassociatedFlows.map(({ flow, index }) => renderFlowForm(index, flow))}
        </div>
      )}

      <button className="add-btn" onClick={addStandaloneFlow} style={{ marginTop: '0.5rem' }}>
        <i className="fas fa-plus"></i> Add Standalone Flow
      </button>

      {/* ─── Additional Tools ─── */}
      <div className="standalone-section" style={{ marginTop: '1.5rem' }}>
        <h4><i className="fas fa-tools"></i> Additional Tools ({tools.length})</h4>
        <p className="field-hint">
          Add connectors, REST APIs, MCP servers, or prompts beyond the flows above.
          <strong> MCP servers</strong> enable dynamic tool discovery but are in preview -- Agent Flows are recommended for beginners.
        </p>
        {tools.map((tool, ti) => renderToolForm(ti, tool))}
        <button className="add-btn" onClick={addTool}>
          <i className="fas fa-plus"></i> Add Tool
        </button>
      </div>

      {/* ─── YAML Modal ─── */}
      {yamlPreview && (
        <div className="yaml-modal-overlay" onClick={() => setYamlPreview(null)}>
          <div className="yaml-modal" onClick={(e) => e.stopPropagation()}>
            <div className="yaml-modal-header">
              <div className="yaml-modal-title">
                <i className="fas fa-code"></i>
                <span>YAML -- {topics[yamlPreview.topicIndex]?.name || 'Topic'}</span>
              </div>
              <div className="yaml-modal-actions">
                {yamlPreview.yaml && (
                  <button className="yaml-copy-btn" onClick={() => navigator.clipboard.writeText(yamlPreview.yaml)} title="Copy to clipboard">
                    <i className="fas fa-copy"></i> Copy
                  </button>
                )}
                <button className="yaml-close-btn" onClick={() => setYamlPreview(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="yaml-modal-hint">
              Paste into Copilot Studio: open topic, click <strong>(...)</strong>, select <strong>Open code editor</strong>, paste, then close editor
            </div>
            <div className="yaml-modal-body">
              {yamlPreview.loading && <div className="yaml-loading"><i className="fas fa-spinner fa-spin"></i> Generating YAML...</div>}
              {yamlPreview.error && <div className="yaml-error"><i className="fas fa-exclamation-triangle"></i> {yamlPreview.error}</div>}
              {yamlPreview.yaml && <pre className="yaml-code"><code>{yamlPreview.yaml}</code></pre>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
