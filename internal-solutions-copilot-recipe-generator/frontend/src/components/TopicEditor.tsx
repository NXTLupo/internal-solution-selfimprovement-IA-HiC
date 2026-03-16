import { useState } from 'react'
import type { TopicConfig, TopicNode } from '../App'
import { generateTopicYaml } from '../services/api'

interface Props {
  topics: TopicConfig[]
  onChange: (topics: TopicConfig[]) => void
}

interface YamlPreview {
  topicIndex: number
  yaml: string
  loading: boolean
  error: string
}

const NODE_TYPES: TopicNode['type'][] = [
  'Message', 'Question', 'Action', 'Condition', 'Redirect', 'Adaptive Card'
]

const ACTION_SUBTYPES = [
  'Call a flow',
  'HTTP request',
  'Set variable value',
  'Parse value',
  'Send Adaptive Card',
  'Send email notification',
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

function emptyNode(): TopicNode {
  return {
    type: 'Message',
    name: '',
    description: '',
  }
}

export default function TopicEditor({ topics, onChange }: Props) {
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set([0]))
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [yamlPreview, setYamlPreview] = useState<YamlPreview | null>(null)

  const handleGenerateYaml = async (topicIndex: number) => {
    const topic = topics[topicIndex]
    if (!topic.name) return
    setYamlPreview({ topicIndex, yaml: '', loading: true, error: '' })
    try {
      const result = await generateTopicYaml(topic)
      setYamlPreview({ topicIndex, yaml: result.yaml, loading: false, error: '' })
    } catch (e: any) {
      setYamlPreview({ topicIndex, yaml: '', loading: false, error: e.message || 'Failed to generate YAML' })
    }
  }

  const handleCopyYaml = () => {
    if (yamlPreview?.yaml) {
      navigator.clipboard.writeText(yamlPreview.yaml)
    }
  }

  const addTopic = () => {
    const newIndex = topics.length
    onChange([...topics, { name: '', description: '', nodes: [] }])
    setExpandedTopics(new Set([...expandedTopics, newIndex]))
  }

  const removeTopic = (index: number) => {
    onChange(topics.filter((_, i) => i !== index))
    const next = new Set(expandedTopics)
    next.delete(index)
    setExpandedTopics(next)
  }

  const updateTopic = (index: number, partial: Partial<TopicConfig>) => {
    onChange(topics.map((t, i) => (i === index ? { ...t, ...partial } : t)))
  }

  const toggleTopicExpand = (index: number) => {
    const next = new Set(expandedTopics)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setExpandedTopics(next)
  }

  const addNode = (topicIndex: number) => {
    const topic = topics[topicIndex]
    const updatedNodes = [...topic.nodes, emptyNode()]
    updateTopic(topicIndex, { nodes: updatedNodes })
    const nodeKey = `${topicIndex}-${updatedNodes.length - 1}`
    setExpandedNodes(new Set([...expandedNodes, nodeKey]))
  }

  const removeNode = (topicIndex: number, nodeIndex: number) => {
    const topic = topics[topicIndex]
    updateTopic(topicIndex, { nodes: topic.nodes.filter((_, i) => i !== nodeIndex) })
  }

  const updateNode = (topicIndex: number, nodeIndex: number, partial: Partial<TopicNode>) => {
    const topic = topics[topicIndex]
    const nodes = topic.nodes.map((n, i) => (i === nodeIndex ? { ...n, ...partial } : n))
    updateTopic(topicIndex, { nodes })
  }

  const moveNode = (topicIndex: number, nodeIndex: number, direction: -1 | 1) => {
    const topic = topics[topicIndex]
    const nodes = [...topic.nodes]
    const newIndex = nodeIndex + direction
    if (newIndex < 0 || newIndex >= nodes.length) return
    ;[nodes[nodeIndex], nodes[newIndex]] = [nodes[newIndex], nodes[nodeIndex]]
    updateTopic(topicIndex, { nodes })
  }

  const toggleNodeExpand = (topicIndex: number, nodeIndex: number) => {
    const key = `${topicIndex}-${nodeIndex}`
    const next = new Set(expandedNodes)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedNodes(next)
  }

  return (
    <div className="topic-editor">
      <div className="topic-editor-intro">
        <i className="fas fa-info-circle"></i>
        <span>
          Define the <strong>topics</strong> (conversation paths) your agent handles,
          then add the exact <strong>nodes</strong> (Message, Question, Action, Condition, etc.)
          that form each topic's flow. The more detail you provide, the more precise your recipe will be.
        </span>
      </div>

      {topics.map((topic, ti) => {
        const isExpanded = expandedTopics.has(ti)
        const nodeCount = topic.nodes.length
        const nodeTypeSummary = topic.nodes.length > 0
          ? [...new Set(topic.nodes.map(n => n.type))].join(' -> ')
          : 'No nodes defined'

        return (
          <div key={ti} className="topic-item">
            {/* Topic Header -- collapsible */}
            <div className="topic-header clickable" onClick={() => toggleTopicExpand(ti)}>
              <div className="topic-header-left">
                <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} topic-chevron`}></i>
                <span className="topic-number">Topic {ti + 1}</span>
                {topic.name && <span className="topic-name-preview">-- {topic.name}</span>}
              </div>
              <div className="topic-header-right">
                <span className="node-count-badge">{nodeCount} node{nodeCount !== 1 ? 's' : ''}</span>
                <button
                  className="yaml-btn"
                  onClick={(e) => { e.stopPropagation(); handleGenerateYaml(ti) }}
                  title="Generate YAML for Copilot Studio code editor"
                  disabled={!topic.name}
                >
                  <i className="fas fa-code"></i> YAML
                </button>
                <button className="remove-btn" onClick={(e) => { e.stopPropagation(); removeTopic(ti) }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>

            {!isExpanded && (
              <div className="topic-collapsed-summary">
                <span className="collapsed-desc">{topic.description?.slice(0, 120) || 'No description'}{topic.description?.length > 120 ? '...' : ''}</span>
                <span className="collapsed-nodes">{nodeTypeSummary}</span>
              </div>
            )}

            {isExpanded && (
              <div className="topic-body">
                {/* Topic metadata */}
                <div className="form-group">
                  <label>Topic Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={topic.name}
                    onChange={(e) => updateTopic(ti, { name: e.target.value })}
                    placeholder="e.g., Research Request, Data Collection, Status Check"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Description
                    <span className="field-hint"> (orchestrator reads this to decide routing -- be specific)</span>
                  </label>
                  <textarea
                    value={topic.description}
                    onChange={(e) => updateTopic(ti, { description: e.target.value })}
                    placeholder="Describe WHEN this topic should activate. Example: 'User wants to start a new research analysis. Route here when the user mentions researching, analyzing, investigating a topic, industry, or competitor.'"
                    rows={3}
                  />
                </div>

                {/* Node Flow Builder */}
                <div className="node-flow-section">
                  <div className="node-flow-header">
                    <h4><i className="fas fa-project-diagram"></i> Topic Flow -- Nodes</h4>
                    <span className="field-hint">Add nodes in the order they appear in the topic's conversation flow</span>
                  </div>

                  {topic.nodes.length === 0 && (
                    <div className="node-flow-empty">
                      <i className="fas fa-plus-circle"></i>
                      <p>No nodes yet. Add nodes to define this topic's conversation flow.</p>
                      <p className="field-hint">Common pattern: Message, Question, Action (Call Flow), Condition, Message/Adaptive Card</p>
                    </div>
                  )}

                  <div className="node-flow-list">
                    {topic.nodes.map((node, ni) => {
                      const nodeKey = `${ti}-${ni}`
                      const isNodeExpanded = expandedNodes.has(nodeKey)
                      const typeColor = NODE_TYPE_COLORS[node.type] || '#888'
                      const typeIcon = NODE_TYPE_ICONS[node.type] || 'fas fa-circle'

                      return (
                        <div key={ni} className="node-flow-item">
                          {/* Connector line */}
                          {ni > 0 && <div className="node-connector"><div className="connector-line"></div></div>}

                          <div className="node-card" style={{ borderLeftColor: typeColor }}>
                            {/* Node compact header */}
                            <div className="node-card-header" onClick={() => toggleNodeExpand(ti, ni)}>
                              <div className="node-card-left">
                                <i className={`${typeIcon} node-type-icon`} style={{ color: typeColor }}></i>
                                <span className="node-type-label" style={{ color: typeColor }}>{node.type}</span>
                                {node.name && <span className="node-name-label">"{node.name}"</span>}
                                {node.variable_name && (
                                  <span className="node-var-badge">
                                    <i className="fas fa-database"></i> {node.variable_scope === 'Global' ? 'Global.' : ''}{node.variable_name}
                                  </span>
                                )}
                              </div>
                              <div className="node-card-actions">
                                <button
                                  className="node-move-btn"
                                  onClick={(e) => { e.stopPropagation(); moveNode(ti, ni, -1) }}
                                  disabled={ni === 0}
                                  title="Move up"
                                >
                                  <i className="fas fa-arrow-up"></i>
                                </button>
                                <button
                                  className="node-move-btn"
                                  onClick={(e) => { e.stopPropagation(); moveNode(ti, ni, 1) }}
                                  disabled={ni === topic.nodes.length - 1}
                                  title="Move down"
                                >
                                  <i className="fas fa-arrow-down"></i>
                                </button>
                                <button
                                  className="remove-btn small"
                                  onClick={(e) => { e.stopPropagation(); removeNode(ti, ni) }}
                                  title="Remove node"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                                <i className={`fas fa-chevron-${isNodeExpanded ? 'up' : 'down'} node-expand-icon`}></i>
                              </div>
                            </div>

                            {/* Node expanded form */}
                            {isNodeExpanded && (
                              <div className="node-card-body">
                                <div className="node-form-row">
                                  <div className="form-group flex-1">
                                    <label>Node Type</label>
                                    <select
                                      value={node.type}
                                      onChange={(e) => updateNode(ti, ni, { type: e.target.value as TopicNode['type'] })}
                                    >
                                      {NODE_TYPES.map(nt => (
                                        <option key={nt} value={nt}>{nt}</option>
                                      ))}
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
                                      node.type === 'Message' ? 'What message does this node display to the user? E.g., "Displays a greeting and explains what the agent can do"' :
                                      node.type === 'Question' ? 'What question does this node ask? E.g., "Asks the user which platform to collect from (Reddit, TrustPilot, Play Store)"' :
                                      node.type === 'Action' ? 'What action does this node perform? E.g., "Calls the Data Collection flow with platform and query parameters, receives job ID"' :
                                      node.type === 'Condition' ? 'What condition does this check? E.g., "Checks if the flow returned success or error status"' :
                                      node.type === 'Redirect' ? 'Which topic does this redirect to? E.g., "Redirects to Export Results topic"' :
                                      'Describe the Adaptive Card this node shows. E.g., "Shows results card with title, summary, and download link button"'
                                    }
                                    rows={2}
                                  />
                                </div>

                                {/* Variable fields -- shown for Question, Action, Condition */}
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

                                {/* Action-specific: subtype + flow name */}
                                {node.type === 'Action' && (
                                  <div className="node-form-row">
                                    <div className="form-group flex-1">
                                      <label>Action Type</label>
                                      <select
                                        value={node.action_type || 'Call a flow'}
                                        onChange={(e) => updateNode(ti, ni, { action_type: e.target.value })}
                                      >
                                        {ACTION_SUBTYPES.map(at => (
                                          <option key={at} value={at}>{at}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {(node.action_type === 'Call a flow' || !node.action_type) && (
                                      <div className="form-group flex-1">
                                        <label>Flow Name</label>
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

                                {/* Condition-specific: expression */}
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

                                {/* Redirect-specific: target topic */}
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
              </div>
            )}
          </div>
        )
      })}

      <button className="add-btn" onClick={addTopic}>
        <i className="fas fa-plus"></i> Add Topic
      </button>

      {/* YAML Preview Modal */}
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
                  <button className="yaml-copy-btn" onClick={handleCopyYaml} title="Copy to clipboard">
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
              {yamlPreview.loading && (
                <div className="yaml-loading">
                  <i className="fas fa-spinner fa-spin"></i> Generating YAML...
                </div>
              )}
              {yamlPreview.error && (
                <div className="yaml-error">
                  <i className="fas fa-exclamation-triangle"></i> {yamlPreview.error}
                </div>
              )}
              {yamlPreview.yaml && (
                <pre className="yaml-code"><code>{yamlPreview.yaml}</code></pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
