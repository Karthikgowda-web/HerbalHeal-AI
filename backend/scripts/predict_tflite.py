import sys
import json
import os

try:
    import numpy as np
    from PIL import Image
    import tflite_runtime.interpreter as tflite
except Exception as e:
    print(json.dumps({"error": f"Dependency Error: {str(e)}"}))
    sys.exit(1)

def predict_plant(image_path):
    if not os.path.exists(image_path):
        return {"error": "Image file not found."}

    # Absolute pathing for Render
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # backend/scripts -> /models (up two levels)
    root_dir = os.path.dirname(os.path.dirname(current_dir))
    model_path = os.path.join(root_dir, 'models', 'plant_model.tflite')
    labels_path = os.path.join(root_dir, 'models', 'labels.json')

    if not os.path.exists(model_path):
        print(json.dumps({"error": f"CRITICAL: Model file missing at {model_path}"}))
        sys.exit(1)
    
    if not os.path.exists(labels_path):
        print(json.dumps({"error": f"CRITICAL: Labels file missing at {labels_path}"}))
        sys.exit(1)

    try:
        # 1. Initialize TFLite interpreter
        interpreter = tflite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()

        # 2. Get input and output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # 3. Load and preprocess image
        img = Image.open(image_path).convert('RGB')
        img = img.resize((224, 224))
        input_data = np.array(img, dtype=np.float32)
        input_data = np.expand_dims(input_data, axis=0)
        
        # Normalize if necessary (assuming 0-255 -> 0-1)
        input_data = input_data / 255.0

        # 4. Set input tensor
        interpreter.set_tensor(input_details[0]['index'], input_data)

        # 5. Run inference
        interpreter.invoke()

        # 6. Get prediction result
        output_data = interpreter.get_tensor(output_details[0]['index'])[0]
        prediction_idx = int(np.argmax(output_data))
        confidence = float(np.max(output_data))

        # 7. Map to label
        with open(labels_path, 'r') as f:
            labels = json.load(f)
        
        # Assuming labels.json is a list where index matches prediction_idx
        # If labels.json is a dict, adjust accordingly.
        # Format: { "0": "Tulsi", "1": "Neem", ... }
        plant_name = labels.get(str(prediction_idx), "Unknown SPECIMEN")
        
        # Return result as JSON string (so Node.js can parse)
        result = {
            "plant_id": prediction_idx,
            "prediction": plant_name,
            "confidence": confidence
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    predict_plant(image_path)
