
import { GoogleGenAI, Type } from "@google/genai";
import { SynthSettings, PatchInfo, GestureState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getPatchAnalysis(settings: SynthSettings): Promise<PatchInfo> {
  const prompt = `Analyze this synth configuration and give a professional profile:
    Patch: "${settings.patch}"
    Cat: ${settings.patchCategory}
    Cutoff: ${settings.cutoff}Hz
    Reson: ${settings.resonance}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            mood: { type: Type.STRING },
            usageTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { name: settings.patch, description: "Standard patch.", mood: "Balanced", usageTips: [] };
  }
}

export async function analyzeGestureFrame(base64Image: string): Promise<GestureState | null> {
  const prompt = `Analyze this top-down view of hands above a piano keyboard. 
  Identify the position of the Left and Right hand. 
  
  REQUIRED JSON FORMAT:
  {
    "leftHand": { "x": number, "y": number, "active": boolean, "gesture": string, "isPincer": boolean, "isClosed": boolean },
    "rightHand": { "x": number, "y": number, "active": boolean, "gesture": string, "isPincer": boolean, "isClosed": boolean },
    "distance": number
  }

  Coordinates are normalized (0 to 1). X is left-to-right. Y is bottom-to-top (height).
  - isPincer: thumb and index finger together.
  - isClosed: hand is a fist.
  - distance: space between hand centers.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leftHand: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                active: { type: Type.BOOLEAN },
                gesture: { type: Type.STRING },
                isPincer: { type: Type.BOOLEAN },
                isClosed: { type: Type.BOOLEAN }
              },
              required: ["x", "y", "active", "gesture", "isPincer", "isClosed"]
            },
            rightHand: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                active: { type: Type.BOOLEAN },
                gesture: { type: Type.STRING },
                isPincer: { type: Type.BOOLEAN },
                isClosed: { type: Type.BOOLEAN }
              },
              required: ["x", "y", "active", "gesture", "isPincer", "isClosed"]
            },
            distance: { type: Type.NUMBER }
          },
          required: ["leftHand", "rightHand", "distance"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return null;
  }
}
