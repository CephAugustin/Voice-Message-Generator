
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VoiceNoteInput, VoiceNoteResult, CustomTemplate, SavedScript, VoiceOption } from "../types";

const SYSTEM_INSTRUCTION = `
You are a Voice Note Script Specialist. Your goal is to transform business research into a high-converting voice note script (35-50s) and a micro-text follow-up.

Core Framework:
1. Pattern Interrupt: Immediate name use + specific detail proving research.
2. The Observation: Politely point out a "leaky hole" or gap.
3. The Work Done: Mention the specific value you already created.
4. The CTA (Goal-driven): Based on the user's selected goal.

Tone Guidelines:
- "Casual": Peer-to-peer, "Yoo/Heyy", "Peace out", "Leaving clients on the table", "Side kick".
- "Professional": Standard B2B, polished, and respectful.
- "Direct": No fluff, focused on efficiency.
- "Warm": Friendly, helpful, empathetic.

If a "CUSTOM TEMPLATE" is provided, prioritize its structure. 
If a "STYLE REFERENCE" (previous script) is provided, mirror its specific energy, vocabulary, and rhythm.
`;

export async function processAudioResearch(base64Audio: string, mimeType: string): Promise<Partial<VoiceNoteInput>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Listen to this voice note where I describe a potential lead and research. 
    Extract the following information into a structured JSON format:
    1. ownerName: The person's name.
    2. businessName: The name of the company or brand.
    3. identifiedGap: The specific problem or "leaky hole" mentioned.
    4. freeValue: The specific help or solution I've already prepared for them.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType
          }
        },
        { text: prompt }
      ],
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
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Audio Processing Error:", error);
    throw error;
  }
}

export async function generateVoiceNote(input: VoiceNoteInput, activeTemplate?: CustomTemplate, referenceScript?: SavedScript): Promise<VoiceNoteResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const templateSection = activeTemplate 
    ? `\nCUSTOM TEMPLATE TO FOLLOW (Structure and Style):\n"${activeTemplate.content}"`
    : `\nDEFAULT STYLE EXAMPLE:\n"Yoo/heyy (name) I went through your (business name) funnel and I saw that your your landing page copy was actually simple and leaving clients on the table. I went ahead and rewrote the whole page with a better structure as I saw the goal of your page was lead generation and I wrote some emails as a side kick. If you like what you got, all I ask in return is for a testimonial that I can use as social proof. Thats all from me, peace out."`;

  const referenceSection = referenceScript
    ? `\nSTYLE REFERENCE (The user loved this script, mirror its vibe and length):\n"Target: ${referenceScript.ownerName} @ ${referenceScript.businessName}\nScript: ${referenceScript.content}"`
    : "";

  const prompt = `
    Generate a voice note script for ${input.platform}.
    
    CONTEXT:
    - Owner: ${input.ownerName}
    - Business: ${input.businessName}
    - Gap: ${input.identifiedGap}
    - Free Value Created: ${input.freeValue}
    
    PREFERENCES:
    - Tone: ${input.tone}
    - Primary Goal: ${input.goal}
    ${templateSection}
    ${referenceSection}

    TASK:
    1. Create a natural voice note script with timing markers [0-5s], etc.
    2. Create a 1-sentence micro-text follow-up.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING, description: "The full voice note script with timing markers." },
            followUp: { type: Type.STRING, description: "The 1-sentence micro-text follow-up." }
          },
          required: ["script", "followUp"]
        },
        temperature: 0.85,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text) as VoiceNoteResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateSpeech(text: string, voice: VoiceOption, tone: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Strip timing markers like [0-5s] so they aren't spoken
  const cleanText = text.replace(/\[.*?\]/g, '').trim();
  
  const prompt = `Voice this script in a ${tone.toLowerCase()} tone: "${cleanText}"`;

  try {
    const response = await ai.models.generateContent({
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
    if (!base64Audio) throw new Error("Failed to generate audio data");
    return base64Audio;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw error;
  }
}

// Utility to decode raw PCM audio from API
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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
