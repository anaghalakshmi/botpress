// src/modules/ai/service/ai.service.ts
import OpenAI from "openai";
import { db } from "../../../lib/db";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import type {
  ChatRequestDto,
  ChatResponseDto,
  AIRawResponse,
  ProductForPrompt,
  EnrichedSuggestedProduct,
  ConversationMessage,
} from "../ai.types";

// ── OpenAI client (singleton) ──────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// ── System prompt ──────────────────────────────────────────────────────────
// Injected once per conversation. The product list is appended dynamically.
const SYSTEM_PROMPT = `
You are GroceryBot, an AI Shopping Assistant for an Indian grocery delivery app.

YOUR RESPONSIBILITIES:
- Suggest grocery products based on what the user asks for
- Convert recipes or meal names into ingredient shopping lists
- Recommend products that fit within a stated budget
- Suggest in-stock alternatives when an item is out of stock
- Answer general grocery-related questions conversationally

STRICT RULES:
1. ONLY suggest products from the "Available Products" list provided below
2. NEVER invent, hallucinate, or guess product names or IDs
3. If no products match the user's request, set suggestedProducts to []
4. Always respond in the EXACT JSON format specified
5. Keep the "reply" field conversational, friendly, and concise (2-3 sentences max)
6. Prices are in paise (100 paise = ₹1) — mention prices in ₹ in your reply
7. Consider budget constraints seriously — only suggest items within budget
8. For recipes, suggest ALL required ingredients if available, not just a few

RESPONSE FORMAT (strict JSON, no markdown, no extra text):
{
  "reply": "conversational response to the user",
  "suggestedProducts": [
    {
      "id": "exact-product-id-from-list",
      "name": "exact-product-name-from-list",
      "reason": "why this product is relevant",
      "quantity": 1
    }
  ],
  "totalEstimatedCost": 0,
  "fallbackMessage": null
}

If no products match, respond with:
{
  "reply": "I couldn't find exact matches, but here's what I suggest...",
  "suggestedProducts": [],
  "totalEstimatedCost": 0,
  "fallbackMessage": "No matching products found. Try browsing our catalogue."
}
`.trim();

// ── Main service ───────────────────────────────────────────────────────────
export const aiService = {
  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    // 1. Fetch products from database
    const products = await fetchProductsForPrompt();

    if (products.length === 0) {
      logger.warn("ai_chat_no_products", { userId: dto.userId });
      return emptyResponse(
        "Our product catalogue is currently unavailable. Please try again shortly."
      );
    }

    // 2. Build the full system prompt with injected product list
    const systemPromptWithProducts = buildSystemPrompt(products, dto.budget);

    // 3. Build messages array (history + new message)
    const messages = buildMessages(
      systemPromptWithProducts,
      dto.history ?? [],
      dto.message
    );

    // 4. Call OpenAI
    let rawResponse: AIRawResponse;
    try {
      rawResponse = await callOpenAI(messages);
    } catch (err) {
      logger.error("ai_chat_openai_error", { error: err, userId: dto.userId });
      return emptyResponse(
        "I'm having trouble connecting to the AI. Please try again in a moment."
      );
    }

    // 5. Validate and enrich suggested products against real DB data
    const enriched = await enrichProducts(
      rawResponse.suggestedProducts,
      products
    );

    // 6. Compute total cost from enriched products (not from AI — don't trust AI math)
    const totalEstimatedCost = enriched.reduce(
      (sum, p) => sum + p.priceInPaise * p.quantity,
      0
    );

    logger.info("ai_chat_success", {
      userId: dto.userId,
      products: enriched.length,
      totalPaise: totalEstimatedCost,
    });

    return {
      message: rawResponse.reply,
      suggestedProducts: enriched,
      totalEstimatedCost,
      hasProducts: enriched.length > 0,
      fallbackMessage: rawResponse.fallbackMessage ?? undefined,
    };
  },
};

// ── Private helpers ────────────────────────────────────────────────────────

// Fetches all active, in-stock products from the database
async function fetchProductsForPrompt(): Promise<ProductForPrompt[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      priceInPaise: true,
      unit: true,
      category: { select: { name: true } },
      inventory: {
        select: { quantityAvailable: true, reservedQuantity: true },
      },
    },
    orderBy: { name: "asc" },
    take: env.AI_MAX_PRODUCTS, // Prevent token overflow
  });

  return products.map((p) => {
    const available =
      (p.inventory?.quantityAvailable ?? 0) -
      (p.inventory?.reservedQuantity ?? 0);
    return {
      id: p.id,
      name: p.name,
      price: p.priceInPaise,
      category: p.category.name,
      unit: p.unit,
      inStock: available > 0,
    };
  });
}

// Injects product list into system prompt
function buildSystemPrompt(
  products: ProductForPrompt[],
  budget?: number
): string {
  const productList = products
    .map(
      (p) =>
        `{"id":"${p.id}","name":"${p.name}","price":${p.price},"category":"${p.category}","unit":"${p.unit}","inStock":${p.inStock}}`
    )
    .join(",\n  ");

  let prompt = `${SYSTEM_PROMPT}\n\nAvailable Products (${products.length} items):\n[\n  ${productList}\n]`;

  if (budget && budget > 0) {
    prompt += `\n\nUser Budget: ${budget} paise (₹${(budget / 100).toFixed(
      0
    )}). Stay within this budget.`;
  }

  return prompt;
}

// Builds OpenAI messages array from history + new message
function buildMessages(
  systemPrompt: string,
  history: ConversationMessage[],
  userMessage: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Include last N messages to stay within token limits
  const trimmedHistory = history.slice(-env.AI_MAX_HISTORY);
  for (const msg of trimmedHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

// Calls OpenAI chat completions API
async function callOpenAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<AIRawResponse> {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages,
    temperature: 0.3, // Lower = more consistent, less creative
    max_tokens: 1500,
    response_format: { type: "json_object" }, // Enforce JSON output
  });

  const rawText = completion.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(rawText) as Partial<AIRawResponse>;
    return {
      reply: parsed.reply ?? "Here are some products I found for you.",
      suggestedProducts: parsed.suggestedProducts ?? [],
      totalEstimatedCost: parsed.totalEstimatedCost ?? 0,
      fallbackMessage: parsed.fallbackMessage ?? undefined,
    };
  } catch {
    logger.warn("ai_chat_json_parse_failed", { rawText });
    // Safe fallback — extract any readable text
    return {
      reply: rawText.slice(0, 200) || "I found some products for you.",
      suggestedProducts: [],
      totalEstimatedCost: 0,
    };
  }
}

// Validates AI-suggested IDs against real DB data and enriches with full product info
// This prevents hallucinated products from being shown to users
async function enrichProducts(
  aiSuggestions: AIRawResponse["suggestedProducts"],
  availableProducts: ProductForPrompt[]
): Promise<EnrichedSuggestedProduct[]> {
  if (!aiSuggestions || aiSuggestions.length === 0) return [];

  // Build a lookup map for O(1) access
  const productMap = new Map(availableProducts.map((p) => [p.id, p]));

  // Filter to only IDs that actually exist in our DB
  const validIds = aiSuggestions
    .map((s) => s.id)
    .filter((id) => productMap.has(id));

  if (validIds.length === 0) return [];

  // Fetch full product details from DB (includes imageUrl, slug etc.)
  const dbProducts = await db.product.findMany({
    where: { id: { in: validIds }, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      priceInPaise: true,
      imageUrl: true,
      unit: true,
      category: { select: { name: true } },
      inventory: {
        select: { quantityAvailable: true, reservedQuantity: true },
      },
    },
  });

  const dbMap = new Map(dbProducts.map((p) => [p.id, p]));

  return aiSuggestions
    .filter((s) => dbMap.has(s.id))
    .map((suggestion) => {
      const p = dbMap.get(suggestion.id)!;
      const available =
        (p.inventory?.quantityAvailable ?? 0) -
        (p.inventory?.reservedQuantity ?? 0);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceInPaise: p.priceInPaise,
        imageUrl: p.imageUrl,
        unit: p.unit,
        category: p.category.name,
        inStock: available > 0,
        availableQty: available,
        quantity: Math.max(1, suggestion.quantity ?? 1),
        reason: suggestion.reason ?? "Recommended for you",
      };
    });
}

// Returns a clean empty response when something goes wrong
function emptyResponse(message: string): ChatResponseDto {
  return {
    message,
    suggestedProducts: [],
    totalEstimatedCost: 0,
    hasProducts: false,
    fallbackMessage: message,
  };
}
