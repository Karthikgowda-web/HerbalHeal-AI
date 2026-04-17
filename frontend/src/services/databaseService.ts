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

import { API_BASE_URL } from '../config';


export async function savePlantToLibrary(result: IdentificationResult, base64Image: string) {
  try {
    // Corrected keys to match history.controller.js: 
    // commonName, scientificName, remedies, imagePath
    const response = await axios.post(`${API_BASE_URL}/history`, {
      commonName: result.name,
      scientificName: result.scientific_name,
      imagePath: base64Image, // Map base64 to imagePath as expected by backend
      remedies: result.remedies,
      timestamp: new Date().toISOString()
    });

    return response.data.historyId;
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
