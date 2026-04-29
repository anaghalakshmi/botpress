// src/modules/ai/ai.types.ts

// ── Request ────────────────────────────────────────────────────────────────
export interface ChatRequestDto {
  message: string;
  userId?: string;
  // Conversation history sent from the client
  history?: ConversationMessage[];
  // Optional budget hint in paise (e.g. 50000 = ₹500)
  budget?: number;
}

// ── Conversation ───────────────────────────────────────────────────────────
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Suggested product (what the AI returns) ────────────────────────────────
export interface AISuggestedProduct {
  id: string; // must match a real product ID from the DB
  name: string;
  reason: string; // why the AI suggested this item
  quantity: number; // suggested quantity
}

// ── Raw AI JSON response (what OpenAI returns) ─────────────────────────────
export interface AIRawResponse {
  reply: string; // conversational text to show the user
  suggestedProducts: AISuggestedProduct[];
  totalEstimatedCost?: number; // in paise
  fallbackMessage?: string; // shown if no products matched
}

// ── Enriched product (merged DB data + AI suggestion) ─────────────────────
export interface EnrichedSuggestedProduct {
  id: string;
  name: string;
  slug: string;
  priceInPaise: number;
  imageUrl: string | null;
  unit: string;
  category: string;
  inStock: boolean;
  availableQty: number;
  quantity: number; // suggested quantity from AI
  reason: string;
}

// ── Final API response ─────────────────────────────────────────────────────
export interface ChatResponseDto {
  message: string;
  suggestedProducts: EnrichedSuggestedProduct[];
  totalEstimatedCost: number; // in paise — sum of suggested items
  hasProducts: boolean;
  fallbackMessage?: string;
}

// ── Product shape injected into prompt ────────────────────────────────────
export interface ProductForPrompt {
  id: string;
  name: string;
  price: number; // in paise
  category: string;
  unit: string;
  inStock: boolean;
}
