import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface IdentificationResult {
  name: string;
  scientificName: string;
  description: string;
  medicinalProperties: string[];
  remedies: {
    condition: string;
    preparation: string;
    expectedOutcome: string;
  }[];
  alternatives: {
    name: string;
    reason: string;
  }[];
  warnings: string;
  cnnAnalysis: {
    confidence: number;
    featuresIdentified: string[];
    neuralMarkers: string;
  };
}

export async function identifyPlant(base64Image: string): Promise<IdentificationResult> {
  const model = "gemini-3.1-pro-preview"; 
  
  const prompt = `Identify this herbal plant and provide detailed information for home remedies. 
  As a botanical CNN (Convolutional Neural Network), perform a deep feature extraction and return the information in JSON format with the following structure:
  {
    "name": "Common Name",
    "scientificName": "Scientific Name",
    "description": "Brief description of the plant",
    "medicinalProperties": ["Property 1", "Property 2"],
    "remedies": [
      { 
        "condition": "Condition it treats", 
        "preparation": "How to prepare the remedy",
        "expectedOutcome": "What results to expect and when"
      }
    ],
    "alternatives": [
      { "name": "Alternative Plant Name", "reason": "Why this is a good alternative" }
    ],
    "warnings": "Safety warnings and contraindications",
    "cnnAnalysis": {
      "confidence": 0.95,
      "featuresIdentified": ["serrated margins", "pinnate venation", "lanceolate shape"],
      "neuralMarkers": "Description of the specific visual patterns the neural network used to identify this taxon."
    }
  }`;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          description: { type: Type.STRING },
          medicinalProperties: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          remedies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                condition: { type: Type.STRING },
                preparation: { type: Type.STRING },
                expectedOutcome: { type: Type.STRING }
              },
              required: ["condition", "preparation", "expectedOutcome"]
            }
          },
          alternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["name", "reason"]
            }
          },
          warnings: { type: Type.STRING },
          cnnAnalysis: {
            type: Type.OBJECT,
            properties: {
              confidence: { type: Type.NUMBER },
              featuresIdentified: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              neuralMarkers: { type: Type.STRING }
            },
            required: ["confidence", "featuresIdentified", "neuralMarkers"]
          }
        },
        required: ["name", "scientificName", "description", "medicinalProperties", "remedies", "alternatives", "warnings", "cnnAnalysis"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Failed to identify plant correctly.");
  }
}

export interface PlantSuggestion {
  name: string;
  scientificName: string;
  description: string;
  howItHelps: string;
  preparation: string;
}

export async function suggestPlantsByIllness(illness: string): Promise<PlantSuggestion[]> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Suggest herbal plants that can help with the following illness or condition: "${illness}". 
  Provide a list of 3-5 plants.
  Return the information in JSON format as an array of objects with the following structure:
  [
    {
      "name": "Common Name",
      "scientificName": "Scientific Name",
      "description": "Brief description of the plant",
      "howItHelps": "How it treats the specific condition",
      "preparation": "How to prepare the remedy"
    }
  ]`;

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            scientificName: { type: Type.STRING },
            description: { type: Type.STRING },
            howItHelps: { type: Type.STRING },
            preparation: { type: Type.STRING }
          },
          required: ["name", "scientificName", "description", "howItHelps", "preparation"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Failed to get plant suggestions.");
  }
}
