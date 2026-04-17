import os
import json
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import io

try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    try:
        from tensorflow import lite as tflite
    except ImportError:
        raise ImportError("Neither 'tflite-runtime' nor 'tensorflow' is installed.")

app = FastAPI()

# Allow Node.js backend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and labels
interpreter = None
labels = {}
input_details = None
output_details = None

def load_model():
    global interpreter, labels, input_details, output_details
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        model_path = os.path.join(root_dir, 'models', 'plant_model.tflite')
        labels_path = os.path.join(root_dir, 'models', 'labels.json')

        print(f"[AI] Loading Model: {model_path}")
        interpreter = tflite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        print(f"[AI] Loading Labels: {labels_path}")
        with open(labels_path, 'r') as f:
            labels = json.load(f)
        
        print("[AI] Model & Labels loaded successfully!")
    except Exception as e:
        print(f"[AI] Critical Error during startup: {str(e)}")

@app.on_event("startup")
async def startup_event():
    load_model()

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": interpreter is not None}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if interpreter is None:
        raise HTTPException(status_code=500, detail="AI Model not loaded")
    
    try:
        # Load and preprocess image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')
        img = img.resize((224, 224))
        
        input_data = np.array(img, dtype=np.float32)
        input_data = np.expand_dims(input_data, axis=0)
        input_data = input_data / 255.0

        # Run inference
        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()

        # Get results
        output_data = interpreter.get_tensor(output_details[0]['index'])[0]
        prediction_idx = int(np.argmax(output_data))
        confidence = float(np.max(output_data))
        
        plant_name = labels.get(str(prediction_idx), "Unknown SPECIMEN")

        return {
            "plant_id": prediction_idx,
            "prediction": plant_name,
            "confidence": confidence
        }

    except Exception as e:
        print(f"[AI] Prediction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5001)
