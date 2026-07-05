import pytest
from pydantic import ValidationError
from app.main import PredictionRequest


def test_prediction_request_accepts_valid_data():
    data = {
        "median_income": 5,
        "house_age": 20,
        "avg_rooms": 5,
        "avg_bedrooms": 1,
        "population": 1000,
        "avg_occupancy": 3,
        "latitude": 34.05,
        "longitude": -118.25,
    }
    request = PredictionRequest(**data)
    assert request.median_income == 5
    assert request.longitude == -118.25


def test_prediction_request_rejects_missing_field():
    data = {
        "median_income": 5,
        "house_age": 20,
        "avg_rooms": 5,
        "avg_bedrooms": 1,
        "population": 1000,
        "avg_occupancy": 3,
        "latitude": 34.05,
    }
    with pytest.raises(ValidationError):
        PredictionRequest(**data)


def test_prediction_request_rejects_invalid_type():
    data = {
        "median_income": "five",
        "house_age": 20,
        "avg_rooms": 5,
        "avg_bedrooms": 1,
        "population": 1000,
        "avg_occupancy": 3,
        "latitude": 34.05,
        "longitude": -118.25,
    }
    with pytest.raises(ValidationError):
        PredictionRequest(**data)