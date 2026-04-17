import sys
import json
import os

# Set output to flush immediately for Node.js capturing
def log_json(data):
    print(json.dumps(data))
    sys.stdout.flush()

try:
    import numpy as np
    from PIL import Image
    try:
        import tflite_runtime.interpreter as tflite
    except ImportError:
        try:
            from tensorflow import lite as tflite
        except ImportError:
            raise ImportError("Neither 'tflite-runtime' nor 'tensorflow' is installed.")
except Exception as e:
    log_json({"error": f"Dependency Error: {str(e)}"})
    sys.exit(1)

def predict_plant(image_path):
    try:
        if not os.path.exists(image_path):
            log_json({"error": f"Image file not found: {image_path}"})
            sys.exit(1)

        # Absolute pathing for Render
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # backend/scripts -> /models (up one level)
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        model_path = os.path.join(root_dir, 'models', 'plant_model.tflite')
        labels_path = os.path.join(root_dir, 'models', 'labels.json')

        # Check model file existence explicitly
        if not os.path.exists(model_path):
            log_json({
                "error": "Model file not found",
                "path": model_path,
                "suggestion": "Ensure plant_model.tflite is in the /models directory"
            })
            sys.exit(1)
        
        if not os.path.exists(labels_path):
            log_json({
                "error": "Labels file not found",
                "path": labels_path,
                "suggestion": "Ensure labels.json is in the /models directory"
            })
            sys.exit(1)

        # 1. Initialize TFLite interpreter
        try:
            interpreter = tflite.Interpreter(model_path=model_path)
            interpreter.allocate_tensors()
        except Exception as e:
            log_json({"error": f"TFLite Initialization Error: {str(e)}"})
            sys.exit(1)

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
        try:
            with open(labels_path, 'r') as f:
                labels = json.load(f)
            
            plant_name = labels.get(str(prediction_idx), "Unknown SPECIMEN")
        except Exception as e:
            log_json({"error": f"Label Loading Error: {str(e)}"})
            sys.exit(1)
        
        # Return result as JSON string (so Node.js can parse)
        result = {
            "plant_id": prediction_idx,
            "prediction": plant_name,
            "confidence": confidence
        }
        log_json(result)

    except FileNotFoundError as fnf:
        log_json({"error": "File Not Found Error", "details": str(fnf)})
        sys.exit(1)
    except Exception as e:
        log_json({"error": f"Inference execution failed: {str(e)}"})
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        log_json({"error": "No image path provided."})
        sys.exit(1)
    
    # Immediate heartbeat to prevent Node.js timeout during cold-start
    print("HEARTBEAT:LOADING_LIBS")
    sys.stdout.flush()
    
    predict_plant(image_path)

