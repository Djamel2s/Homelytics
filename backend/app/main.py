from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Homelytics API")

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
    return PredictionResponse(predicted_price=-1)