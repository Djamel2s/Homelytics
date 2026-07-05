import os
import sys
import mlflow
from mlflow.tracking import MlflowClient

MODEL_NAME = "homelytics-price-model"


def main():
    mlflow.set_tracking_uri(
        os.environ.get("MLFLOW_TRACKING_URI", "https://dagshub.com/djamelofficiel.pro/homelytics.mlflow")
    )
    client = MlflowClient()

    try:
        version = client.get_model_version_by_alias(MODEL_NAME, "production")
    except Exception:
        print("No model version found with alias 'production'. Aborting deployment.")
        sys.exit(1)

    print(f"Model {MODEL_NAME} v{version.version} has alias 'production' — proceeding.")


if __name__ == "__main__":
    main()