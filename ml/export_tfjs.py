"""
Export trained 11-class Keras gesture model to TensorFlow.js format and JSON fallback.
Target directory: web/public/models/
FEATURE_SPEC: Version 2.0.0
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import json
import shutil
import yaml
import numpy as np
import tf_keras as keras


def export_model_to_tfjs(model, output_dir, meta_info):
    os.makedirs(output_dir, exist_ok=True)
    
    weights_manifest_entries = []
    binary_parts = []
    weights_dict = {}
    
    for weight in model.weights:
        clean_name = weight.name.split(":")[0]
        val = weight.numpy().astype(np.float32)
        
        weights_manifest_entries.append({
            "name": clean_name,
            "shape": list(val.shape),
            "dtype": "float32"
        })
        
        binary_parts.append(val.tobytes())
        weights_dict[clean_name] = {
            "shape": list(val.shape),
            "values": val.flatten().tolist()
        }
        
    bin_filename = "group1-shard1of1.bin"
    bin_path = os.path.join(output_dir, bin_filename)
    with open(bin_path, "wb") as f:
        for chunk in binary_parts:
            f.write(chunk)
    print(f"Exported binary weights to {bin_path} ({os.path.getsize(bin_path)} bytes)")
    
    model_config = json.loads(model.to_json())
    tfjs_model_json = {
        "format": "layers-model",
        "generatedBy": f"keras v{keras.__version__}",
        "convertedBy": "SignMedic TF.js Exporter",
        "modelTopology": model_config,
        "weightsManifest": [
            {
                "paths": [bin_filename],
                "weights": weights_manifest_entries
            }
        ]
    }
    
    model_json_path = os.path.join(output_dir, "model.json")
    with open(model_json_path, "w", encoding="utf-8") as f:
        json.dump(tfjs_model_json, f, indent=2)
    print(f"Exported model topology to {model_json_path}")
    
    weights_json_path = os.path.join(output_dir, "weights.json")
    with open(weights_json_path, "w", encoding="utf-8") as f:
        json.dump(weights_dict, f)
    print(f"Exported fallback weights to {weights_json_path}")
    
    model_meta_path = os.path.join(output_dir, "model_meta.json")
    with open(model_meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_info, f, indent=2)
    print(f"Exported model metadata to {model_meta_path}")
    
    source_task = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")
    dest_task = os.path.join(output_dir, "hand_landmarker.task")
    if os.path.exists(source_task):
        shutil.copy2(source_task, dest_task)
        print(f"Copied MediaPipe asset to {dest_task}")


def main():
    model_path = os.path.join(os.path.dirname(__file__), "final_model.h5")
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "public", "models"))
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}. Run train.py first.")
        
    print(f"Loading trained model from {model_path}...")
    model = keras.models.load_model(model_path)
    
    target_classes = ["Air", "Makan", "Saya", "Tuli", "Maaf", "Terima kasih", "Batuk", "Demam", "Pilek", "Sesak Nafas"]
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
            if "data" in cfg and "target_classes" in cfg["data"]:
                target_classes = list(cfg["data"]["target_classes"])
                
    meta_info = {
        "classes": target_classes,
        "num_classes": len(target_classes) + 1,
        "reject_class_index": len(target_classes),
        "reject_class_name": "_OTHER_",
        "T": 30,
        "feature_dim": 129,
        "normalization_version": "2.0.0",
        "threshold": 0.85,
        "stability_n": 2,
        "source": "SignMedic Clinical Triage Model v2.0.0"
    }
    
    print("=" * 60)
    print("Exporting SignMedic v2.0.0 Model to Web Assets")
    print(f"Destination: {output_dir}")
    print(f"Metadata: {meta_info}")
    print("=" * 60)
    
    export_model_to_tfjs(model, output_dir, meta_info)
    print("\nExport completed successfully!")


if __name__ == "__main__":
    main()
