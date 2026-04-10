import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  async analyzeNews(title: string, description: string) {
    const prompt = `الخبر: ${title}\nالتفاصيل: ${description}\nالمطلوب: شرح السياق، الأهمية، والتوقعات في نقاط Markdown واضحة ومختصرة.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "أنت محلل إخباري محترف لصحيفة الحقيقة. قدم تحليلاً عميقاً ومحايداً.",
      },
    });
    return response.text;
  },

  async chat(message: string, newsContext: string) {
    const prompt = `سؤال المستخدم: ${message}\nسياق الأخبار الحالية:\n${newsContext}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "أنت مساعد ذكي لصحيفة الحقيقة. أجب على أسئلة المستخدم بناءً على السياق الإخباري المتاح.",
      },
    });
    return response.text;
  },

  async generateQuiz(title: string, description: string) {
    const prompt = `أنشئ سؤال اختيار متعدد واحد بالعربية عن: "${title}: ${description}". التنسيق: JSON object { "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0-3 }`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || "{}");
  },

  async textToSpeech(text: string) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
};
