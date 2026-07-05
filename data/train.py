import subprocess
import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import root_mean_squared_error

def get_git_commit_hash():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"]
    ).decode("utf-8").strip()


def get_dvc_data_version():
    with open("data/california_housing.csv.dvc") as f:
        for line in f:
            if "md5" in line:
                return line.strip()
    return "unknown"


def main():
    mlflow.set_tracking_uri("https://dagshub.com/djamelofficiel.pro/homelytics.mlflow")
    mlflow.set_experiment("homelytics-price-prediction")

    df = pd.read_csv("data/california_housing.csv")
    X = df.drop(columns=["MedHouseVal"])
    y = df["MedHouseVal"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    with mlflow.start_run():
        n_estimators = 100
        max_depth = 10

        model = RandomForestRegressor(
            n_estimators=n_estimators, max_depth=max_depth, random_state=42
        )
        model.fit(X_train, y_train)

        preds = model.predict(X_test)
        rmse = root_mean_squared_error(y_test, preds)

        mlflow.log_param("n_estimators", n_estimators)
        mlflow.log_param("max_depth", max_depth)
        mlflow.log_param("git_commit", get_git_commit_hash())
        mlflow.log_param("dvc_data_version", get_dvc_data_version())
        mlflow.log_metric("rmse", rmse)

        mlflow.sklearn.log_model(
            model, "model", registered_model_name="homelytics-price-model"
        )

        print(f"RMSE: {rmse:.4f} — run logged to MLflow.")


if __name__ == "__main__":
    main()