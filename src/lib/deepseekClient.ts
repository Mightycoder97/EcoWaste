const deepseekUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1';
// Keep the API Key server-side only
const defaultApiKey = process.env.DEEPSEEK_API_KEY || '';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekConfig {
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Invoca el modelo DeepSeek V4 (deepseek-chat) para procesamiento de texto
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  jsonMode: boolean = false,
  config?: DeepSeekConfig
): Promise<string> {
  const apiKey = config?.apiKey || defaultApiKey;
  const baseUrl = config?.baseUrl || deepseekUrl;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no está configurada.');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: config?.temperature ?? 0.1,
      max_tokens: config?.maxTokens ?? 2000,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Error de DeepSeek API (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}
