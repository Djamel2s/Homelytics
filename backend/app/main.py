import os
import pandas as pd
import mlflow
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="Homelytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)

MLFLOW_TRACKING_URI = os.environ.get(
    "MLFLOW_TRACKING_URI", "https://dagshub.com/djamelofficiel.pro/homelytics.mlflow"
)
MODEL_STAGE = os.environ.get("MODEL_STAGE", "None")
MODEL_NAME = "homelytics-price-model"

mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

model = None


@app.on_event("startup")
def load_model():
    global model
    model_uri = f"models:/{MODEL_NAME}/{MODEL_STAGE}"
    model = mlflow.pyfunc.load_model(model_uri)


class PredictionRequest(BaseModel):
    median_income: float
    house_age: float
    avg_rooms: float
    avg_bedrooms: float
    population: float
    avg_occupancy: float
    latitude: float
    longitude: float


class PredictionResponse(BaseModel):
    predicted_price: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    input_df = pd.DataFrame([{
        "MedInc": request.median_income,
        "HouseAge": request.house_age,
        "AveRooms": request.avg_rooms,
        "AveBedrms": request.avg_bedrooms,
        "Population": request.population,
        "AveOccup": request.avg_occupancy,
        "Latitude": request.latitude,
        "Longitude": request.longitude,
    }])

    prediction = model.predict(input_df)[0]
    return PredictionResponse(predicted_price=float(prediction) * 100_000)