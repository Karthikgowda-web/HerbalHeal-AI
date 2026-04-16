import sys
import json
import os
import numpy as np
from PIL import Image

# Optimized import: Try to load TFLite without full TensorFlow if possible
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    try:
        from tensorflow.lite.python.interpreter import Interpreter as tflite
    except ImportError:
        import tensorflow as tf
        tflite = tf.lite.Interpreter

def predict_plant(image_path):
    if not os.path.exists(image_path):
        return {"error": "Image file not found."}

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(os.path.dirname(script_dir))
    model_path = os.path.join(root_dir, 'models', 'plant_model.tflite')
    labels_path = os.path.join(root_dir, 'models', 'labels.json')

    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model not found at {model_path}"}))
        sys.exit(1)
    
    if not os.path.exists(labels_path):
        print(json.dumps({"error": f"Labels not found at {labels_path}"}))
        sys.exit(1)

    try:
        # 1. Initialize TFLite interpreter
        if hasattr(tflite, 'Interpreter'):
            interpreter = tflite.Interpreter(model_path=model_path)
        else:
            interpreter = tflite(model_path=model_path)
            
        interpreter.allocate_tensors()

        # Get input and output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()

        # 2. Preprocessing
        img_width, img_height = 224, 224
        raw_img = Image.open(image_path).resize((img_width, img_height))
        
        if raw_img.mode != 'RGB':
            raw_img = raw_img.convert('RGB')
        
        # Convert to numpy array and preprocess for MobileNetV2
        # MobileNetV2 expects [-1, 1] range: (img / 127.5) - 1.0
        img_array = np.array(raw_img, dtype=np.float32)
        img_array = (img_array / 127.5) - 1.0
        img_array = np.expand_dims(img_array, axis=0)

        # 3. Inference
        interpreter.set_tensor(input_details[0]['index'], img_array)
        interpreter.invoke()
        
        predictions = interpreter.get_tensor(output_details[0]['index'])[0]

        # 4. Results
        with open(labels_path, 'r') as f:
            class_indices = json.load(f)
        index_to_name = {v: k for k, v in class_indices.items()}

        predicted_class_index = np.argmax(predictions)
        confidence = float(predictions[predicted_class_index])
        predicted_name = index_to_name[predicted_class_index]

        return {
            "prediction": predicted_name,
            "plant_id": int(predicted_class_index),
            "confidence": round(confidence, 4),
            "status": "success"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    result = predict_plant(image_path)
    print(json.dumps(result))
