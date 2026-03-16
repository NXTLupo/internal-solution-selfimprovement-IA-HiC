import { useState } from 'react'
import type { RecipeFormData } from '../App'

interface Props {
  formData: RecipeFormData
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>
  onGenerate: () => void
  templateName?: string | null
}

export default function DescribeAgent({ formData, setFormData, onGenerate, templateName }: Props) {
  const [charCount, setCharCount] = useState(formData.agent_description.length)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, agent_name: e.target.value }))
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setCharCount(val.length)
    setFormData(prev => ({ ...prev, agent_description: val }))
  }

  const canGenerate = formData.agent_name.trim().length > 0 && formData.agent_description.trim().length >= 20

  return (
    <div className="describe-agent">
      {templateName && (
        <div className="template-badge">
          <i className="fas fa-layer-group"></i> Template: {templateName}
        </div>
      )}
      <div className="describe-header">
        <div className="describe-icon">
          <i className={templateName ? "fas fa-robot" : "fas fa-magic"}></i>
        </div>
        <h2>{templateName ? `${formData.agent_name} Recipe` : 'Describe Your Agent'}</h2>
        <p>{templateName
          ? 'Review the pre-filled description below, then generate your complete build recipe. The description contains all the architecture details — topics, flows, tools, and delivery channels.'
          : "Tell us what you want your Copilot Studio agent to do. We'll design the complete architecture -- topics, flows, tools, knowledge sources, and a step-by-step build recipe -- all from your description."
        }</p>
      </div>

      <div className="describe-form">
        <div className="describe-field">
          <label htmlFor="agent-name">Agent Name</label>
          <input
            id="agent-name"
            type="text"
            placeholder="e.g., Customer Onboarding Agent"
            value={formData.agent_name}
            onChange={handleNameChange}
            maxLength={100}
          />
        </div>

        <div className="describe-field">
          <label htmlFor="agent-desc">
            What should this agent do?
            <span className="char-count">{charCount} characters</span>
          </label>
          <textarea
            id="agent-desc"
            placeholder={"Describe your agent's purpose, what it should help users with, what data sources it needs, what actions it should take, and how it should deliver results.\n\nFor example:\n\"An agent that helps sales reps look up customer account history from Salesforce, generate personalized follow-up emails using AI, and schedule meetings through Outlook. It should work in Teams and respond to emails with [Sales] in the subject line.\""}
            value={formData.agent_description}
            onChange={handleDescriptionChange}
            rows={12}
          />
          <div className="describe-hint">
            <i className="fas fa-lightbulb"></i>
            The more detail you provide, the better the recipe. Include: what the agent does, data sources, APIs, delivery channels (Teams, email), and any specific workflows.
          </div>
        </div>

        <button
          className="describe-generate-btn"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          <i className="fas fa-bolt"></i>
          Generate Complete Recipe
        </button>

        {!canGenerate && (
          <p className="describe-validation">
            {formData.agent_name.trim().length === 0
              ? 'Please enter an agent name to continue.'
              : 'Please provide at least 20 characters describing what the agent should do.'}
          </p>
        )}
      </div>
    </div>
  )
}
