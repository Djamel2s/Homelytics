import sys

import mlflow
import pandas as pd
from mlflow.tracking import MlflowClient
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split

R2_THRESHOLD = 0.60
MODEL_NAME = "homelytics-price-model"


def check_quality_gate(r2, threshold=R2_THRESHOLD):
    return r2 >= threshold


def get_latest_version(client, name):
    versions = client.search_model_versions(f"name='{name}'")
    return max(versions, key=lambda v: int(v.version))


def main():
    mlflow.set_tracking_uri("https://dagshub.com/djamelofficiel.pro/homelytics.mlflow")
    client = MlflowClient()

    latest = get_latest_version(client, MODEL_NAME)
    print(f"Evaluating {MODEL_NAME} version {latest.version} (run_id={latest.run_id})")

    client.set_registered_model_alias(MODEL_NAME, "staging", latest.version)
    print(f"Alias 'staging' set on version {latest.version}")

    model = mlflow.pyfunc.load_model(f"models:/{MODEL_NAME}@staging")

    df = pd.read_csv("data/california_housing.csv")
    X = df.drop(columns=["MedHouseVal"])
    y = df["MedHouseVal"]
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    print(f"R2 score: {r2:.4f}")

    if not check_quality_gate(r2):
        print(f"Quality gate FAILED (R2 < {R2_THRESHOLD}) — model stays in Staging.")
        sys.exit(1)

    client.set_registered_model_alias(MODEL_NAME, "production", latest.version)
    print(f"Quality gate PASSED — alias 'production' set on version {latest.version}")


if __name__ == "__main__":
    main()