import { IdentificationResult } from "./geminiService";
import axios from 'axios';

export interface SavedPlant extends IdentificationResult {
  _id: string; 
  plant_name: string;
  commonName?: string;
  scientific_name: string;
  scientificName?: string;
  image_url: string;
  imagePath?: string;
  createdAt: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

export async function savePlantToLibrary(result: IdentificationResult, base64Image: string) {
  try {
    
    const response = await axios.post(`${API_BASE_URL}/history`, {
      plant_name: result.name,
      scientific_name: result.scientific_name,
      image_url: base64Image,
      overview: result.overview,
      remedies: result.remedies,
      alternatives: result.alternatives,
      medicinalProperties: result.medicinalProperties,
      warnings: result.warnings,
      cnnAnalysis: result.cnnAnalysis
    });

    
    await axios.post(`${API_BASE_URL}/archive`, {
      name: result.name || (result as any).plant_name || "Unknown",
      scientificName: result.scientific_name || "Unknown",
      imageUrl: base64Image,
      remedies: result.remedies,
      timestamp: new Date().toISOString()
    });

    return response.data._id;
  } catch (error) {
    console.error("Error saving plant to library:", error);
    throw error;
  }
}

export async function getSavedPlants(): Promise<SavedPlant[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/history`);
    return response.data;
  } catch (error) {
    console.error("Error fetching saved plants:", error);
    return [];
  }
}

export async function deletePlantFromLibrary(id: string) {
  
  console.warn("Delete not implemented for MongoDB yet.");
}
