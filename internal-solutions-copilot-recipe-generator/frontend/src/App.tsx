import { useState } from 'react'
import TemplateGallery from './components/TemplateGallery'
import DescribeAgent from './components/DescribeAgent'
import RecipeWizard from './components/RecipeWizard'
import RecipePreview from './components/RecipePreview'
import ExportPanel from './components/ExportPanel'

export type AppView = 'gallery' | 'describe' | 'wizard' | 'preview'

export interface TemplateSummary {
  id: string
  name: string
  description: string
  replicates_service: string
  icon: string
  estimated_build_time: string
  complexity: string
  thumbnail: string
}

export interface EntityChoice {
  id: string
  displayName: string
}

export interface TopicNode {
  type: 'Message' | 'Question' | 'Action' | 'Condition' | 'Redirect' | 'Adaptive Card'
  name: string
  description: string
  variable_name?: string
  variable_scope?: 'Topic' | 'Global'
  action_type?: string
  flow_name?: string
  condition_expression?: string
  redirect_topic?: string
  entity_type?: string  // string, number, boolean, choice, email, age, etc.
  choices?: EntityChoice[]  // For choice entities (ClosedListEntity)
  entity_file?: string  // Filename in static/entities/ for downloadable entity .txt
}

export interface TopicConfig {
  name: string
  description: string
  trigger_phrases?: string
  nodes: TopicNode[]
}

export interface FlowParam {
  name: string
  type: 'String' | 'Number' | 'Boolean'
  description?: string
}

export interface FlowConfig {
  name: string
  flow_type: 'Agent Flow' | 'Cloud Flow'
  call_method: 'Agent-level tool' | 'Topic-level tool' | 'Both'
  trigger_type: string
  description: string
  actions_description: string
  use_async_pattern: boolean
  input_params: FlowParam[]
  output_params: FlowParam[]
  http_endpoints: { method: string; url: string; description: string }[]
}

export interface KnowledgeSource {
  source_type: string
  path_or_url: string
  name: string
  description: string
}

export interface ToolConfig {
  tool_type: string
  name: string
  description: string
  inputs: { name: string; type: string }[]
  outputs: { name: string; type: string }[]
  // MCP-specific fields (only used when tool_type === 'MCP')
  mcp_server_url: string
  mcp_server_description: string
  mcp_is_advanced_alternative: boolean
}

export interface TriggerConfig {
  trigger_type: string  // 'SharePoint file upload' | 'Outlook email' | 'Scheduled' | 'Manual'
  description: string
  configuration: string  // e.g., folder path, subject filter, schedule pattern
}

export interface EnvironmentVariable {
  display_name: string
  data_type: string  // Text, Number, Boolean
  purpose: string  // e.g., "API Key for Claude", "API endpoint URL"
  is_secret: boolean
}

export interface RecipeFormData {
  agent_name: string
  agent_description: string
  persona_instructions: string
  orchestration_model: string
  auth_mode: string
  disable_general_knowledge: boolean
  sharepoint_site_url: string
  sharepoint_folders: string
  topics: TopicConfig[]
  flows: FlowConfig[]
  knowledge_sources: KnowledgeSource[]
  delivery_channels: string[]
  tools: ToolConfig[]
  triggers: TriggerConfig[]
  environment_variables: EnvironmentVariable[]
  template_id?: string
}

const emptyForm: RecipeFormData = {
  agent_name: '',
  agent_description: '',
  persona_instructions: '',
  orchestration_model: 'GPT-5 Chat GA',
  auth_mode: 'Authenticate with Microsoft',
  disable_general_knowledge: true,
  sharepoint_site_url: '',
  sharepoint_folders: '',
  topics: [] as TopicConfig[],
  flows: [],
  knowledge_sources: [],
  delivery_channels: ['Teams Adaptive Card', 'Email'],
  tools: [],
  triggers: [],
  environment_variables: [],
}

export default function App() {
  const [view, setView] = useState<AppView>('gallery')
  const [formData, setFormData] = useState<RecipeFormData>({ ...emptyForm })
  const [recipeContent, setRecipeContent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null)

  const handleStartFromScratch = () => {
    setFormData({ ...emptyForm })
    setSelectedTemplate(null)
    setView('describe')
  }

  const handleSelectTemplate = async (template: TemplateSummary | null) => {
    if (!template) {
      handleStartFromScratch()
      return
    }

    try {
      const res = await fetch(`/api/templates/${template.id}`)
      const data = await res.json()
      if (data.prefilled) {
        setFormData({
          ...emptyForm,
          agent_name: data.prefilled.agent_name || template.name,
          agent_description: data.prefilled.agent_description || '',
          template_id: template.id,
        })
      }
      setSelectedTemplate(template)
      // Go directly to preview — pre-generated recipes are served instantly
      setRecipeContent('')
      setView('preview')
    } catch {
      setFormData({ ...emptyForm, agent_name: template.name, template_id: template.id })
      setSelectedTemplate(template)
      setRecipeContent('')
      setView('preview')
    }
  }

  const handleGenerate = () => {
    setRecipeContent('')
    setView('preview')
  }

  const handleBack = () => {
    if (view === 'wizard' || view === 'describe') {
      setView('gallery')
    } else if (view === 'preview') {
      // Templates go back to gallery, custom goes back to describe
      setView(selectedTemplate ? 'gallery' : 'describe')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          {view !== 'gallery' && (
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div className="header-brand">
            <h1>Copilot Studio <span className="accent">Recipe Generator</span></h1>
            <p className="header-subtitle">Intelligence Augmentation Suite</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {view === 'gallery' && (
          <TemplateGallery onSelect={handleSelectTemplate} />
        )}
        {view === 'describe' && (
          <DescribeAgent
            formData={formData}
            setFormData={setFormData}
            onGenerate={handleGenerate}
            templateName={selectedTemplate?.name}
          />
        )}
        {view === 'wizard' && (
          <RecipeWizard
            formData={formData}
            setFormData={setFormData}
            onGenerate={handleGenerate}
            templateName={selectedTemplate?.name}
          />
        )}
        {view === 'preview' && (
          <>
            <RecipePreview formData={formData} onContentUpdate={setRecipeContent} />
            {recipeContent && (
              <ExportPanel content={recipeContent} agentName={formData.agent_name} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
