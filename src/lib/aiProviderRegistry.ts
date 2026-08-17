export interface AIModel {
  id: string;
  name: string;
  isFree: boolean;
  capabilities: ('text' | 'vision' | 'ocr' | 'json')[];
}

export interface AIProvider {
  id: string;
  name: string;
  urlApiKey: string;
  models: AIModel[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'google',
    name: 'Google Gemini (AI Pro)',
    urlApiKey: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Ultra Rápido)', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recomendado)', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isFree: true, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: false, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gemini-2.0-pro-exp', name: 'Gemini 2.0 Pro', isFree: false, capabilities: ['text', 'vision', 'ocr', 'json'] },
    ]
  },
  {
    id: 'groq',
    name: 'Groq (Llama 3)',
    urlApiKey: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', isFree: true, capabilities: ['text', 'json'] },
      { id: 'llama3-8b-8192', name: 'Llama 3 8B', isFree: true, capabilities: ['text'] },
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    urlApiKey: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', isFree: false, capabilities: ['text', 'vision', 'ocr', 'json'] },
      { id: 'gpt-4o', name: 'GPT-4o', isFree: false, capabilities: ['text', 'vision', 'ocr', 'json'] },
    ]
  }
];
