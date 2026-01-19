
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { VoiceNoteInput, VoiceNoteResult, CustomTemplate, SavedScript, VoiceOption } from "../types";

/**
 * Sanitizes input strings to prevent malformed payloads or prompt interference.
 */
const sanitize = (val: string): string => {
  return val.trim().replace(/[<>]/g, ''); // Simple cleanup of tags
};

const SYSTEM_INSTRUCTION = `
You are a Voice Note Script Specialist. Your goal is to transform business research into a high-converting voice note script (35-50s) and a micro-text follow-up.

Core Framework:
1. Pattern Interrupt: Immediate name use + specific detail proving research.
2. The Observation: Politely point out a "leaky hole" or gap.
3. The Work Done: Mention the specific value you already created.
4. The CTA (Goal-driven): Based on the user's selected goal.

Tone Guidelines:
- "Casual": Peer-to-peer, energetic, informal.
- "Professional": Standard B2B, polished, and respectful.
- "Direct": Efficiency-focused, no fluff.
- "Warm": Friendly, helpful, empathetic.

Output strictly in valid JSON format.
`;

/**
 * Extracts JSON from model response text, handling potential Markdown code blocks.
 */
const parseSafeJSON = (text: string) => {
  try {
    const cleaned = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", text);
    throw new Error("The AI returned an invalid response format. Please try again.");
  }
};

export async function processAudioResearch(base64Audio: string, mimeType: string): Promise<Partial<VoiceNoteInput>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Listen to this voice note and extract the research details.
    Return JSON with: ownerName, businessName, identifiedGap, freeValue.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Corrected multi-modal contents structure to use a single Content object with parts
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ownerName: { type: Type.STRING },
            businessName: { type: Type.STRING },
            identifiedGap: { type: Type.STRING },
            freeValue: { type: Type.STRING }
          }
        },
        temperature: 0.1, // Low temperature for high extraction accuracy
      }
    });

    const result = parseSafeJSON(response.text || '{}');
    return {
      ownerName: sanitize(result.ownerName || ''),
      businessName: sanitize(result.businessName || ''),
      identifiedGap: sanitize(result.identifiedGap || ''),
      freeValue: sanitize(result.freeValue || '')
    };
  } catch (error) {
    console.error("Audio Processing Error:", error);
    throw new Error("Unable to parse the audio research. Please speak more clearly or fill fields manually.");
  }
}

export async function generateVoiceNote(input: VoiceNoteInput, activeTemplate?: CustomTemplate, referenceScript?: SavedScript): Promise<VoiceNoteResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const templateSection = activeTemplate 
    ? `\nCUSTOM TEMPLATE TO FOLLOW (Structure and Style):\n"${activeTemplate.content}"`
    : `\nDEFAULT STYLE EXAMPLE:\n"Hey [Name], checked out [Business] and noticed [Gap]. Already mocked up [Value]. Mind if I send it over?"`;

  const referenceSection = referenceScript
    ? `\nSTYLE REFERENCE (Mirror this energy):\n"${referenceScript.content}"`
    : "";

  const prompt = `
    Generate a voice note script for ${input.platform}.
    
    CONTEXT:
    - Owner: ${sanitize(input.ownerName)}
    - Business: ${sanitize(input.businessName)}
    - Gap: ${sanitize(input.identifiedGap)}
    - Free Value: ${sanitize(input.freeValue)}
    - Tone: ${input.tone}
    - Goal: ${input.goal}

    ${templateSection}
    ${referenceSection}

    TASK:
    1. Provide 'script' string with markers like [0-5s].
    2. Provide 'followUp' string (1 sentence).
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            followUp: { type: Type.STRING }
          },
          required: ["script", "followUp"]
        },
        temperature: 0.7,
      },
    });

    return parseSafeJSON(response.text || '{}') as VoiceNoteResult;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("The script generator encountered an error. Please check your internet connection and try again.");
  }
}

export async function generateSpeech(text: string, voice: VoiceOption, tone: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanText = text.replace(/\[.*?\]/g, '').trim();
  const prompt = `Voice this script in a ${tone.toLowerCase()} tone: "${cleanText}"`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS candidate was empty");
    return base64Audio;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw new Error("Voice synthesis failed. Please try a different persona.");
  }
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
