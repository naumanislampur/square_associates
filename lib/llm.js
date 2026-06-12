import OpenAI from 'openai'

let _client = null

export function getLlmClient() {
  if (_client) return _client
  const apiKey = process.env.EMERGENT_LLM_KEY
  if (!apiKey) throw new Error('Missing EMERGENT_LLM_KEY')
  _client = new OpenAI({
    apiKey,
    baseURL: 'https://integrations.emergentagent.com/llm',
  })
  return _client
}
