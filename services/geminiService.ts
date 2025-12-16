import { GoogleGenAI, Type } from "@google/genai";
import { GeminiBookingSuggestion } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    // API Key is missing or empty
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const parseBookingRequest = async (
  prompt: string, 
  today: Date
): Promise<GeminiBookingSuggestion | null> => {
  const ai = getAiClient();
  if (!ai) {
    console.warn("Gemini API Client not initialized (Missing Key)");
    return null;
  }

  const systemInstruction = `
    You are a smart calendar assistant.
    Today is ${today.toDateString()}.
    Extract the desired date, start time, duration, and meeting title from the user's natural language request.
    If the duration is not specified, assume 30 minutes.
    Return the date in YYYY-MM-DD format and time in HH:mm (24-hour) format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            startTime: { type: Type.STRING, description: "HH:mm" },
            durationMinutes: { type: Type.INTEGER },
            title: { type: Type.STRING },
            reasoning: { type: Type.STRING, description: "Short explanation of how you interpreted the request" }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeminiBookingSuggestion;
    }
    return null;

  } catch (error) {
    console.error("Error parsing booking request with Gemini:", error);
    return null;
  }
};