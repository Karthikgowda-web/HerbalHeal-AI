import sys
import json
import os
import numpy as np
import tensorflow as tf
from PIL import Image
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' # Suppress TF runtime logs from stdout
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def predict_plant(image_path):
    if not os.path.exists(image_path):
        return {"error": "Image file not found."}

    # Setup core paths dynamically
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, 'models', 'plant_model_lite.keras')
    labels_path = os.path.join(base_dir, 'models', 'labels.json')

    if not os.path.exists(model_path):
        return {"error": "Trained ML model not found. Run the training script first."}
    
    if not os.path.exists(labels_path):
        return {"error": "Model labels JSON not found."}

    try:
        # Load compiled keras Model
        model = load_model(model_path)

        # Data Consistency Check: Load Labels dynamically
        with open(labels_path, 'r') as f:
            class_indices = json.load(f)
        index_to_name = {v: k for k, v in class_indices.items()}

        sys.stderr.write(f"\n[Validation] Loaded strict mapping: {class_indices}\n")

        # 2. Preprocessing Audit: Enforce 224x224 RGB formatting
        img_width, img_height = 224, 224
        raw_img = Image.open(image_path).resize((img_width, img_height))
        
        if raw_img.mode != 'RGB':
            raw_img = raw_img.convert('RGB')
        
        # Convert to numpy array safely in [0, 255] format
        img_array = np.array(raw_img, dtype=np.float32)
        img_array = np.expand_dims(img_array, axis=0) # Add batch dimension
        
        # Math Sync: applying proper MobileNetV2 preprocessing logic scaling to [-1, 1]
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

        # Forward pass / Inference
        predictions = model.predict(img_array, verbose=0)[0]
        
        # 3. Model Confidence Check: Log ALL confidences to standard error
        sys.stderr.write("\n--- Model Confidence Scores ---\n")
        for idx, conf in enumerate(predictions):
            plant_name = index_to_name.get(idx, "Unknown")
            sys.stderr.write(f"{plant_name}: {(conf * 100):.2f}%\n")
        sys.stderr.write("-------------------------------\n")

        predicted_class_index = np.argmax(predictions)
        confidence = float(predictions[predicted_class_index])
        raw_name = index_to_name[predicted_class_index]
        
        # 4. Final Logging Trigger
        sys.stderr.write(f">>> Predicted Class: {raw_name}, Confidence: {confidence:.4f}\n")
        sys.stderr.write("=================================\n")

        predicted_name = raw_name # Do not strip underscores. Preserve EXACT seed.js match
        
        scientific_name = f"Medicinal Herb Specimen"

        return {
            "prediction": predicted_name,
            "plant_id": int(predicted_class_index),
            "confidence": round(confidence, 4),
            "scientific_name": scientific_name,
            "status": "success"
        }
    except Exception as e:
        sys.stderr.write(str(e) + "\n")
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    
    result = predict_plant(image_path)
    # Standard-out JSON formatted so `server.js` node spawn command can parse it.
    print(json.dumps(result))
