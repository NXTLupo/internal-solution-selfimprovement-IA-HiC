import type { RecipeFormData, TemplateSummary } from '../App'

export async function fetchTemplates(): Promise<TemplateSummary[]> {
  const res = await fetch('/api/templates')
  const data = await res.json()
  return data.templates || []
}

export async function fetchTemplateDetail(id: string) {
  const res = await fetch(`/api/templates/${id}`)
  return res.json()
}

export async function* streamRecipe(formData: RecipeFormData): AsyncGenerator<string> {
  const res = await fetch('/api/generate-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })

  if (!res.ok) {
    throw new Error(`Generation failed: ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content') {
            yield data.text
          } else if (data.type === 'error') {
            throw new Error(data.message)
          } else if (data.type === 'done') {
            return
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue
          throw e
        }
      }
    }
  }
}

export async function exportRecipe(content: string, format: string, agentName: string) {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_content: content, format, agent_name: agentName }),
  })
  return res.json()
}

export async function generateTopicYaml(topic: { name: string; description: string; trigger_phrases?: string; nodes: any[] }, agentName: string = 'Agent') {
  const res = await fetch('/api/topic-yaml', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, agent_name: agentName }),
  })
  if (!res.ok) {
    throw new Error(`YAML generation failed: ${res.status}`)
  }
  return res.json()
}
