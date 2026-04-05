import { IdentificationResult } from "./geminiService";

const STORAGE_KEY = "herbal_plants_library";

export interface SavedPlant extends IdentificationResult {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export async function savePlantToLibrary(result: IdentificationResult, base64Image: string) {
  try {
    const savedPlants = await getSavedPlants();
    
    const newPlant: SavedPlant = {
      ...result,
      id: crypto.randomUUID(),
      imageUrl: base64Image, // Store base64 directly in localStorage for now (simple fallback)
      createdAt: new Date().toISOString(),
    };

    const updatedLibrary = [newPlant, ...savedPlants];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLibrary));

    return newPlant.id;
  } catch (error) {
    console.error("Error saving plant to library:", error);
    throw error;
  }
}

export async function getSavedPlants(): Promise<SavedPlant[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const plants = JSON.parse(data) as SavedPlant[];
    // Sort by date descending
    return plants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching saved plants:", error);
    return [];
  }
}

export async function deletePlantFromLibrary(id: string) {
  try {
    const savedPlants = await getSavedPlants();
    const updatedLibrary = savedPlants.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLibrary));
  } catch (error) {
    console.error("Error deleting plant:", error);
    throw error;
  }
}
