const defaultApiKey = process.env.GEMINI_API_KEY || '';
const defaultModel = 'gemini-2.5-flash';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  text: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: {
      web: {
        uri: string;
        title: string;
      };
    }[];
    groundingSupports?: any[];
  };
}

/**
 * Invoca el modelo Google Gemini con soporte de Google Search Grounding y JSON mode
 */
export async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  jsonMode: boolean = false,
  config?: GeminiConfig
): Promise<GeminiResponse> {
  const apiKey = config?.apiKey || defaultApiKey;
  const modelName = config?.model || defaultModel;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: systemInstruction
      ? {
          parts: [{ text: systemInstruction }],
        }
      : undefined,
    generationConfig: {
      temperature: config?.temperature ?? 0.1,
      maxOutputTokens: config?.maxTokens ?? 2048,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain',
    },
    // Habilitar Google Search Grounding
    tools: [
      {
        googleSearch: {},
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Error de Gemini API (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';
  const groundingMetadata = candidate?.groundingMetadata;

  return {
    text,
    groundingMetadata,
  };
}
