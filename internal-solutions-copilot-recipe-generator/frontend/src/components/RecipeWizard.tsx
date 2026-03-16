import { useState } from 'react'
import type { RecipeFormData, TopicConfig, FlowConfig, KnowledgeSource, ToolConfig, TriggerConfig, EnvironmentVariable } from '../App'
import CapabilityEditor from './CapabilityEditor'
import KnowledgeSourcePicker from './KnowledgeSourcePicker'
import AgentDescriptionInput from './AgentDescriptionInput'

interface Props {
  formData: RecipeFormData
  setFormData: (data: RecipeFormData | ((prev: RecipeFormData) => RecipeFormData)) => void
  onGenerate: () => void
  templateName?: string
}

const STEPS = [
  { label: 'Identity', icon: 'fas fa-id-badge' },
  { label: 'Config', icon: 'fas fa-cog' },
  { label: 'Capabilities', icon: 'fas fa-cubes' },
  { label: 'Knowledge', icon: 'fas fa-database' },
  { label: 'Delivery', icon: 'fas fa-paper-plane' },
  { label: 'Review', icon: 'fas fa-check-circle' },
]

const ORCHESTRATION_MODELS = ['GPT-5 Chat GA', 'GPT-4.1 GA', 'GPT-5 Reasoning (preview)']
const AUTH_MODES = ['No Authentication', 'Authenticate with Microsoft', 'Manual OAuth2']
const DELIVERY_OPTIONS = ['Teams Adaptive Card', 'Email', 'SharePoint File Save']
const TRIGGER_TYPES = [
  'SharePoint file upload',
  'Outlook email arrival',
  'Scheduled (recurrence)',
  'Manual only (no automatic triggers)',
]

export default function RecipeWizard({ formData, setFormData, onGenerate, templateName }: Props) {
  const [step, setStep] = useState(0)

  // Use functional state updates to avoid stale closure issues when
  // CapabilityEditor updates both topics and flows in the same event handler
  const update = (partial: Partial<RecipeFormData>) => {
    setFormData(prev => ({ ...prev, ...partial }))
  }

  const canProceed = () => {
    if (step === 0) return formData.agent_name.trim().length > 0
    return true
  }

  // Trigger management
  const addTrigger = () => {
    update({ triggers: [...(formData.triggers || []), { trigger_type: 'SharePoint file upload', description: '', configuration: '' }] })
  }
  const removeTrigger = (i: number) => {
    update({ triggers: (formData.triggers || []).filter((_, idx) => idx !== i) })
  }
  const updateTrigger = (i: number, partial: Partial<TriggerConfig>) => {
    update({ triggers: (formData.triggers || []).map((t, idx) => idx === i ? { ...t, ...partial } : t) })
  }

  // Environment variable management
  const addEnvVar = () => {
    update({ environment_variables: [...(formData.environment_variables || []), { display_name: '', data_type: 'Text', purpose: '', is_secret: true }] })
  }
  const removeEnvVar = (i: number) => {
    update({ environment_variables: (formData.environment_variables || []).filter((_, idx) => idx !== i) })
  }
  const updateEnvVar = (i: number, partial: Partial<EnvironmentVariable>) => {
    update({ environment_variables: (formData.environment_variables || []).map((v, idx) => idx === i ? { ...v, ...partial } : v) })
  }

  // Helper: compute capabilities for the Review step
  const getCapabilities = () => {
    const assignedFlowIndices = new Set<number>()
    const caps = formData.topics.map((topic) => {
      const refNames = topic.nodes
        .filter(n => n.type === 'Action' && (n.action_type === 'Call a flow' || !n.action_type) && n.flow_name)
        .map(n => n.flow_name!)
      const flowIndices: number[] = []
      const capFlows: FlowConfig[] = []
      for (const name of refNames) {
        const fi = formData.flows.findIndex((f, i) => f.name === name && !assignedFlowIndices.has(i))
        if (fi !== -1) {
          assignedFlowIndices.add(fi)
          flowIndices.push(fi)
          capFlows.push(formData.flows[fi])
        }
      }
      return { topic, flows: capFlows }
    })
    const unassociated = formData.flows.filter((_, i) => !assignedFlowIndices.has(i))
    return { caps, unassociated }
  }

  const renderStep = () => {
    switch (step) {
      case 0: // Identity
        return (
          <div className="wizard-step">
            <h3>Agent Identity</h3>
            <p className="step-description">Define your Copilot Studio agent's name, description, and persona.</p>

            <div className="form-group">
              <label>Agent Name <span className="required">*</span></label>
              <input
                type="text"
                value={formData.agent_name}
                onChange={(e) => update({ agent_name: e.target.value })}
                placeholder="e.g., Industry Research Analyst"
                maxLength={42}
              />
              <span className="char-count">{formData.agent_name.length}/42</span>
            </div>

            <div className="form-group">
              <label>Agent Description</label>
              <textarea
                value={formData.agent_description}
                onChange={(e) => update({ agent_description: e.target.value })}
                placeholder="Brief description of what the agent does (shown in Copilot Studio overview)"
                maxLength={1024}
                rows={3}
              />
              <span className="char-count">{formData.agent_description.length}/1,024</span>
            </div>

            <AgentDescriptionInput
              value={formData.persona_instructions}
              onChange={(val) => update({ persona_instructions: val })}
            />
          </div>
        )

      case 1: // Config
        return (
          <div className="wizard-step">
            <h3>Agent Configuration</h3>
            <p className="step-description">Set the orchestration model, authentication, SharePoint structure, and knowledge settings.</p>

            <div className="form-group">
              <label>Orchestration Model</label>
              <p className="field-hint">This model routes user intent to topics and tools -- it is NOT the model used for analysis.</p>
              <div className="radio-group">
                {ORCHESTRATION_MODELS.map((m) => (
                  <label key={m} className="radio-option">
                    <input
                      type="radio"
                      name="model"
                      checked={formData.orchestration_model === m}
                      onChange={() => update({ orchestration_model: m })}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Authentication Mode</label>
              <div className="radio-group">
                {AUTH_MODES.map((m) => (
                  <label key={m} className="radio-option">
                    <input
                      type="radio"
                      name="auth"
                      checked={formData.auth_mode === m}
                      onChange={() => update({ auth_mode: m })}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.disable_general_knowledge}
                  onChange={(e) => update({ disable_general_knowledge: e.target.checked })}
                />
                <span>Disable general knowledge (recommended for grounded, evidence-based agents)</span>
              </label>
            </div>

            <hr className="section-divider" />

            <div className="form-group">
              <label><i className="fas fa-sitemap" style={{ color: '#3B82F6', marginRight: '0.4rem' }}></i> SharePoint Site URL</label>
              <p className="field-hint">If your agent reads/writes to SharePoint, paste the site URL. The recipe will include folder setup instructions.</p>
              <input
                type="text"
                value={formData.sharepoint_site_url || ''}
                onChange={(e) => update({ sharepoint_site_url: e.target.value })}
                placeholder="e.g., https://yourcompany.sharepoint.com/sites/Research"
              />
            </div>

            <div className="form-group">
              <label>SharePoint Folder Structure</label>
              <p className="field-hint">List the folders this agent needs (one per line). The recipe will include creation instructions for each.</p>
              <textarea
                value={formData.sharepoint_folders || ''}
                onChange={(e) => update({ sharepoint_folders: e.target.value })}
                placeholder={"e.g.:\nResearch Documents/Inbox\nPDF Output\nJSON Output\nInfographics\nDrafts for Review\nTemplates"}
                rows={4}
                className="mono-textarea"
              />
            </div>
          </div>
        )

      case 2: // Capabilities (unified Topics + Flows + Tools)
        return (
          <div className="wizard-step">
            <h3>Agent Capabilities</h3>
            <p className="step-description">
              Define each capability as a topic paired with its flows. Each capability becomes a contiguous build sequence in the recipe: topic creation, then flow build, then tool registration -- all together.
            </p>
            <CapabilityEditor
              topics={formData.topics}
              flows={formData.flows}
              tools={formData.tools}
              onTopicsChange={(topics: TopicConfig[]) => update({ topics })}
              onFlowsChange={(flows: FlowConfig[]) => update({ flows })}
              onToolsChange={(tools: ToolConfig[]) => update({ tools })}
            />
          </div>
        )

      case 3: // Knowledge
        return (
          <div className="wizard-step">
            <h3>Knowledge Sources</h3>
            <p className="step-description">Add SharePoint, Dataverse, or website knowledge sources for your agent.</p>
            <KnowledgeSourcePicker
              sources={formData.knowledge_sources}
              onChange={(sources: KnowledgeSource[]) => update({ knowledge_sources: sources })}
            />
          </div>
        )

      case 4: // Delivery & Triggers
        return (
          <div className="wizard-step">
            <h3>Delivery, Triggers & Environment</h3>
            <p className="step-description">Configure delivery channels, automatic triggers, and environment variables (API keys).</p>

            {/* Delivery Channels */}
            <div className="form-group">
              <label><i className="fas fa-paper-plane" style={{ color: '#10B981', marginRight: '0.4rem' }}></i> Delivery Channels</label>
              <div className="checkbox-group">
                {DELIVERY_OPTIONS.map((opt) => (
                  <label key={opt} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={formData.delivery_channels.includes(opt)}
                      onChange={(e) => {
                        const channels = e.target.checked
                          ? [...formData.delivery_channels, opt]
                          : formData.delivery_channels.filter((c) => c !== opt)
                        update({ delivery_channels: channels })
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="section-divider" />

            {/* Automatic Triggers */}
            <div className="form-group">
              <label><i className="fas fa-bolt" style={{ color: '#F59E0B', marginRight: '0.4rem' }}></i> Automatic Triggers</label>
              <p className="field-hint">Add event triggers so the agent runs automatically (e.g., when a file is uploaded to SharePoint, or an email arrives). Triggers only activate after publishing.</p>
            </div>

            {(formData.triggers || []).map((trigger, i) => (
              <div key={i} className="trigger-item">
                <div className="item-header">
                  <span className="item-number">Trigger {i + 1}</span>
                  <button className="remove-btn" onClick={() => removeTrigger(i)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Trigger Type</label>
                    <select
                      value={trigger.trigger_type}
                      onChange={(e) => updateTrigger(i, { trigger_type: e.target.value })}
                    >
                      {TRIGGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>Configuration</label>
                    <input
                      type="text"
                      value={trigger.configuration}
                      onChange={(e) => updateTrigger(i, { configuration: e.target.value })}
                      placeholder={
                        trigger.trigger_type.includes('SharePoint') ? 'Folder path, e.g., /Research Documents/Inbox' :
                        trigger.trigger_type.includes('Outlook') ? 'Subject filter, e.g., [Research]' :
                        trigger.trigger_type.includes('Scheduled') ? 'Schedule, e.g., Every 30 minutes' :
                        'N/A'
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Trigger Instruction</label>
                  <textarea
                    value={trigger.description}
                    onChange={(e) => updateTrigger(i, { description: e.target.value })}
                    placeholder="What should the agent do when this trigger fires? E.g., 'Analyze the uploaded document using the default model and generate a full report with infographics.'"
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <button className="add-btn" onClick={addTrigger}>
              <i className="fas fa-plus"></i> Add Trigger
            </button>

            <hr className="section-divider" />

            {/* Environment Variables */}
            <div className="form-group">
              <label><i className="fas fa-key" style={{ color: '#8B5CF6', marginRight: '0.4rem' }}></i> Environment Variables</label>
              <p className="field-hint">List API keys and configuration values your agent needs. The recipe will include a full phase on creating these as Power Platform environment variables with Secure Inputs/Outputs.</p>
            </div>

            {(formData.environment_variables || []).map((envVar, i) => (
              <div key={i} className="env-var-item">
                <div className="item-header">
                  <span className="item-number">Variable {i + 1}</span>
                  <button className="remove-btn" onClick={() => removeEnvVar(i)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={envVar.display_name}
                      onChange={(e) => updateEnvVar(i, { display_name: e.target.value })}
                      placeholder="e.g., Anthropic API Key"
                    />
                  </div>
                  <div className="form-group" style={{ width: '120px' }}>
                    <label>Type</label>
                    <select
                      value={envVar.data_type}
                      onChange={(e) => updateEnvVar(i, { data_type: e.target.value })}
                    >
                      <option value="Text">Text</option>
                      <option value="Number">Number</option>
                      <option value="Boolean">Boolean</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ width: '80px' }}>
                    <label>Secret?</label>
                    <label className="toggle-label" style={{ padding: '0.5rem 0' }}>
                      <input
                        type="checkbox"
                        checked={envVar.is_secret}
                        onChange={(e) => updateEnvVar(i, { is_secret: e.target.checked })}
                      />
                      <span>{envVar.is_secret ? 'Yes' : 'No'}</span>
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Purpose</label>
                  <input
                    type="text"
                    value={envVar.purpose}
                    onChange={(e) => updateEnvVar(i, { purpose: e.target.value })}
                    placeholder="e.g., Authentication key for the Anthropic Claude API (starts with sk-ant-...)"
                  />
                </div>
              </div>
            ))}

            <button className="add-btn" onClick={addEnvVar}>
              <i className="fas fa-plus"></i> Add Environment Variable
            </button>
          </div>
        )

      case 5: // Review
        {
          const { caps, unassociated } = getCapabilities()
          return (
            <div className="wizard-step">
              <h3>Review & Generate</h3>
              <p className="step-description">Review your configuration before generating the recipe.</p>

              <div className="review-summary">
                <div className="review-section">
                  <h4><i className="fas fa-id-badge"></i> Agent Identity</h4>
                  <div className="review-item"><strong>Name:</strong> {formData.agent_name}</div>
                  {formData.agent_description && <div className="review-item"><strong>Description:</strong> {formData.agent_description}</div>}
                  {formData.persona_instructions && <div className="review-item"><strong>Instructions:</strong> {formData.persona_instructions.slice(0, 200)}...</div>}
                </div>

                <div className="review-section">
                  <h4><i className="fas fa-cog"></i> Configuration</h4>
                  <div className="review-item"><strong>Model:</strong> {formData.orchestration_model}</div>
                  <div className="review-item"><strong>Auth:</strong> {formData.auth_mode}</div>
                  <div className="review-item"><strong>General Knowledge:</strong> {formData.disable_general_knowledge ? 'Disabled' : 'Enabled'}</div>
                  {formData.sharepoint_site_url && <div className="review-item"><strong>SharePoint:</strong> {formData.sharepoint_site_url}</div>}
                </div>

                {/* Capability-grouped review */}
                <div className="review-section">
                  <h4><i className="fas fa-cubes"></i> Capabilities ({caps.length})</h4>
                  {caps.length === 0 && <div className="review-item muted">None defined -- AI will generate defaults</div>}
                  {caps.map((cap, ci) => (
                    <div key={ci} className="review-capability">
                      <div className="review-item">
                        <strong>Capability {ci + 1}: {cap.topic.name || 'Unnamed'}</strong>
                      </div>
                      <div className="review-sub-items">
                        <div className="review-item">
                          Topic: {cap.topic.nodes?.length || 0} nodes
                          {cap.topic.nodes && cap.topic.nodes.length > 0 && (
                            <span className="review-node-flow"> ({cap.topic.nodes.map(n => n.type).join(' -> ')})</span>
                          )}
                        </div>
                        {cap.flows.map((f, fi) => (
                          <div key={fi} className="review-item">
                            Flow: <strong>{f.name}</strong> ({f.flow_type})
                            {f.input_params?.length > 0 && ` | ${f.input_params.length} inputs`}
                            {f.output_params?.length > 0 && ` | ${f.output_params.length} outputs`}
                            {f.use_async_pattern && ' (async)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Standalone flows */}
                {unassociated.length > 0 && (
                  <div className="review-section">
                    <h4><i className="fas fa-stream"></i> Standalone Flows ({unassociated.length})</h4>
                    {unassociated.map((f, i) => (
                      <div key={i} className="review-item">
                        {f.name || 'Unnamed'} ({f.flow_type}) -- {f.call_method || 'Agent-level tool'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tools */}
                {formData.tools.length > 0 && (
                  <div className="review-section">
                    <h4><i className="fas fa-tools"></i> Tools ({formData.tools.length})</h4>
                    {formData.tools.map((t, i) => (
                      <div key={i} className="review-item">
                        {t.name} ({t.tool_type})
                        {t.tool_type === 'MCP' && t.mcp_server_url && ` -- Server: ${t.mcp_server_url}`}
                        {t.tool_type === 'MCP' && t.mcp_is_advanced_alternative && ' [Advanced Alt.]'}
                      </div>
                    ))}
                  </div>
                )}

                <div className="review-section">
                  <h4><i className="fas fa-database"></i> Knowledge ({formData.knowledge_sources.length})</h4>
                  {formData.knowledge_sources.map((ks, i) => (
                    <div key={i} className="review-item">{ks.name || ks.source_type}: {ks.path_or_url}</div>
                  ))}
                  {formData.knowledge_sources.length === 0 && <div className="review-item muted">None configured</div>}
                </div>

                <div className="review-section">
                  <h4><i className="fas fa-paper-plane"></i> Delivery & Triggers</h4>
                  {formData.delivery_channels.map((ch, i) => (
                    <div key={i} className="review-item">{ch}</div>
                  ))}
                  {(formData.triggers || []).map((tr, i) => (
                    <div key={i} className="review-item">Trigger: {tr.trigger_type} {tr.configuration && `(${tr.configuration})`}</div>
                  ))}
                </div>

                {(formData.environment_variables || []).length > 0 && (
                  <div className="review-section">
                    <h4><i className="fas fa-key"></i> Environment Variables ({formData.environment_variables.length})</h4>
                    {formData.environment_variables.map((ev, i) => (
                      <div key={i} className="review-item">{ev.display_name} ({ev.data_type}) {ev.is_secret ? '[SECRET]' : ''} -- {ev.purpose}</div>
                    ))}
                  </div>
                )}
              </div>

              <button className="generate-btn" onClick={onGenerate}>
                <i className="fas fa-magic"></i> Generate Complete Recipe
              </button>
            </div>
          )
        }

      default:
        return null
    }
  }

  return (
    <div className="recipe-wizard">
      {templateName && (
        <div className="template-badge">
          <i className="fas fa-layer-group"></i> Template: {templateName}
        </div>
      )}

      {/* Step indicator */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            onClick={() => i <= step && setStep(i)}
          >
            <div className="dot-icon">
              {i < step ? <i className="fas fa-check"></i> : <i className={s.icon}></i>}
            </div>
            <span className="dot-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      {renderStep()}

      {/* Navigation */}
      <div className="wizard-nav">
        {step > 0 && (
          <button className="nav-btn prev" onClick={() => setStep(step - 1)}>
            <i className="fas fa-arrow-left"></i> Previous
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            className="nav-btn next"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next <i className="fas fa-arrow-right"></i>
          </button>
        )}
      </div>
    </div>
  )
}
