interface Props {
  value: string
  onChange: (value: string) => void
}

const PERSONA_HINTS = [
  '[PERSONA] -- Define tone, expertise level, and behavioral rules',
  '[CHAIN-OF-THOUGHT] -- Step-by-step reasoning process',
  '[OUTPUT FORMAT] -- Expected response structure',
  '[CONSTRAINTS] -- Guardrails and limitations',
  '[ENVIRONMENT] -- SharePoint paths, API keys, brand colors',
]

export default function AgentDescriptionInput({ value, onChange }: Props) {
  const insertTemplate = () => {
    const template = `[PERSONA]
You are a [role] at [organization]. Your tone is professional, concise, and jargon-free. You deliver deterministic, evidence-based responses -- never speculate, never hallucinate.

[CHAIN-OF-THOUGHT]
For every request, reason step-by-step:
1. Identify the scope and requirements
2. Retrieve relevant data from knowledge sources
3. Analyze and synthesize findings
4. Structure the response with citations

[OUTPUT FORMAT]
Return structured responses with clear sections. Include citations for every factual claim.

[CONSTRAINTS]
- Only answer questions within the agent's domain
- Cite every factual claim with its source
- If no relevant data is found, say so explicitly
- Never fabricate information

[ENVIRONMENT]
SharePoint Site: https://[your-org].sharepoint.com/sites/[site]
Brand Colors: Primary #0D0D0D, Accent #B8B800`

    onChange(template)
  }

  return (
    <div className="form-group description-input">
      <label>
        Persona Instructions
        <span className="char-count">{value.length}/8,000</span>
      </label>
      <p className="field-hint">
        These instructions control agent behavior. Max 8,000 characters in Copilot Studio.
      </p>

      {!value && (
        <button className="template-insert-btn" onClick={insertTemplate}>
          <i className="fas fa-magic"></i> Insert Template
        </button>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Define your agent's persona, reasoning approach, output format, constraints, and environment..."
        maxLength={8000}
        rows={12}
        className="mono-textarea"
      />

      <div className="hints-bar">
        {PERSONA_HINTS.map((hint, i) => (
          <span key={i} className="hint-chip">{hint}</span>
        ))}
      </div>
    </div>
  )
}
