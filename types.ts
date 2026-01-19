
export interface CustomTemplate {
  id: string;
  name: string;
  content: string;
}

export interface SavedScript {
  id: string;
  title: string;
  content: string;
  ownerName: string;
  businessName: string;
  createdAt: number;
}

export type VoiceOption = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface VoiceNoteInput {
  ownerName: string;
  businessName: string;
  identifiedGap: string;
  freeValue: string;
  platform: 'LinkedIn' | 'Instagram' | 'WhatsApp';
  tone: 'Casual' | 'Professional' | 'Direct' | 'Warm';
  goal: 'Permission to Send' | 'Testimonial/Feedback' | 'Book a Call' | 'Quick Question';
  templateId?: string;
  referenceScriptId?: string;
  selectedVoice: VoiceOption;
}

export interface VoiceNoteResult {
  script: string;
  followUp: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
