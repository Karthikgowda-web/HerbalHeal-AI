

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

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${baseUrl}/identify`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as IdentificationResult;
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
