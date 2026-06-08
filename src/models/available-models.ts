// Selectable Gemini models. dailyLimit is a BEST-GUESS free-tier RPD used only to
// compute an approximate "remaining" — Google does NOT expose real quota via API,
// so adjust these to match your AI Studio dashboard.
export interface ModelInfo {
  id: string;
  label: string;
  dailyLimit: number;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'gemini-2.5-flash-lite', label: 'Flash-Lite 2.5 (highest free limit)', dailyLimit: 1000 },
  { id: 'gemini-2.0-flash-lite', label: 'Flash-Lite 2.0', dailyLimit: 200 },
  { id: 'gemini-2.0-flash', label: 'Flash 2.0', dailyLimit: 200 },
  { id: 'gemini-2.5-flash', label: 'Flash 2.5', dailyLimit: 20 },
  { id: 'gemini-2.5-pro', label: 'Pro (very low free limit)', dailyLimit: 50 },
];

export const MODEL_IDS = AVAILABLE_MODELS.map((m) => m.id);

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
