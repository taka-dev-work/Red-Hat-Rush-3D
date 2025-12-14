import { GoogleGenAI } from "@google/genai";

// Helper to get safe random enemy flavor
export const getRandomFallbackEnemy = () => {
  const prefixes = ["Angry", "Bouncy", "Spiky", "Goofy", "Turbo"];
  const nouns = ["Slime", "Box", "Critter", "Blob", "Meanie"];
  const taunts = ["I'm gonna getcha!", "Boooo!", "You can't jump high enough!", "Plop plop!", "Rolling attack!"];
  
  const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  
  return {
    name: `${random(prefixes)} ${random(nouns)}`,
    taunt: random(taunts)
  };
};

// Circuit breaker state to prevent spamming API when quota is exceeded
let isQuotaExhausted = false;

export const generateEnemyFlavor = async (): Promise<{ name: string; taunt: string }> => {
  // If no API key or we already hit the limit, skip the API call
  if (!process.env.API_KEY || isQuotaExhausted) {
    return getRandomFallbackEnemy();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Generate a JSON object with a funny video game enemy "name" (max 2 words) and a short "taunt" (max 6 words). Do not use markdown code blocks.',
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return getRandomFallbackEnemy();
    
    const data = JSON.parse(text);
    return {
      name: data.name || "Mystery Blob",
      taunt: data.taunt || "..."
    };
  } catch (e: any) {
    // Robust check for rate limiting errors (HTTP 429 or gRPC RESOURCE_EXHAUSTED)
    const isRateLimit = 
      e?.status === 429 || 
      e?.status === 'RESOURCE_EXHAUSTED' || 
      e?.error?.code === 429 || 
      e?.error?.status === 'RESOURCE_EXHAUSTED' ||
      (e?.message && e.message.includes('429'));

    if (isRateLimit) {
      console.warn("Gemini API quota exhausted. Switching to offline fallback for enemy names.");
      isQuotaExhausted = true;
    } else {
      console.error("Gemini generation failed", e);
    }
    
    return getRandomFallbackEnemy();
  }
};