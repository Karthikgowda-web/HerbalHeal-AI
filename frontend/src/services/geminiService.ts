import axios from 'axios';

export interface IdentificationResult {
  name: string;
  scientific_name: string;
  overview: {
    en: string;
    hi: string;
    kn: string;
  };
  remedies: {
    en: string;
    hi: string;
    kn: string;
  };
  alternatives: {
    en: string[];
    hi: string[];
    kn: string[];
  };
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
  try {
    const res = await fetch(base64Image);
    const blob = await res.blob();
    
    const formData = new FormData();
    formData.append('image', blob, 'upload.jpg');

    let baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    if (!baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/api';
    }
    const response = await axios.post(`${baseUrl}/identify`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    });

    return response.data as IdentificationResult;
  } catch (error: any) {
    console.error("Identification Service Error:", error);
    throw new Error(error.message || "Failed to identify plant correctly.");
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
  console.log("Mocking search for:", illness);
  return [
    {
      name: "Search coming soon to local AI",
      scientificName: "Local.ai",
      description: "Search logic is currently being migrated to the local Node.js backend.",
      howItHelps: `Helps with ${illness} (Placeholder)`,
      preparation: "Wait for next update."
    }
  ];
}
