import axios from 'axios';
import { API_BASE_URL, GEMINI_API_KEY } from '../config';

export interface IdentificationResult {
  name: string;
  scientific_name: string;
  overview: { en: string; hi: string; kn: string; };
  remedies: { en: string; hi: string; kn: string; };
  alternatives: { en: string[]; hi: string[]; kn: string[]; };
  medicinalProperties: string[];
  warnings: string;
  cnnAnalysis: {
    confidence: number;
    featuresIdentified: string[];
    neuralMarkers: string;
  };
  imageUrl?: string;
  id?: string;
}

export async function identifyPlant(base64Image: string): Promise<IdentificationResult> {
  // 1. High-speed Gemini Direct Path (Uses API Key)
  if (GEMINI_KEY) {
    try {
      console.log("[AI] Priority: Using Gemini Vision for rapid analysis...");
      const genAIUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
      const base64Data = base64Image.split(',')[1];
      
      const prompt = `Identify this medicinal plant. Return ONLY a JSON object with this exact structure:
      {
        "name": "Common English Name",
        "scientific_name": "Latin Name",
        "overview": { "en": "...", "hi": "...", "kn": "..." },
        "remedies": { "en": "...", "hi": "...", "kn": "..." },
        "alternatives": { "en": ["..."], "hi": ["..."], "kn": ["..."] },
        "medicinalProperties": ["Prop1", "Prop2"],
        "warnings": "Important precautions",
        "cnnAnalysis": { "confidence": 0.98, "featuresIdentified": ["Pattern matching"], "neuralMarkers": "Gemini Flash AI" }
      }
      Focus on medicinal benefits. Trilingual response required.`;

      const response = await axios.post(genAIUrl, {
        contents: [{
          parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }]
        }]
      }, { timeout: 15000 });

      const textResponse = response.data.candidates[0].content.parts[0].text;
      const cleanJson = textResponse.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("[AI] Gemini failed, falling back to local backend:", err);
    }
  }

  // 2. Custom Model Path (Uses Backend)
  try {
    const res = await fetch(base64Image);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('image', blob, 'upload.jpg');

    const response = await axios.post(`${API_BASE_URL}/identify`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000 // Increased to 90s for Render's most extreme cold-starts
    });



    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error(`Connection to AI server timed out. Check your internet or VITE_API_BASE_URL settings.`);
    }
    throw new Error(error.response?.data?.message || "Identification server is currently unreachable.");
  }
}

// Support for GEMINI_KEY variable
const GEMINI_KEY = GEMINI_API_KEY;


