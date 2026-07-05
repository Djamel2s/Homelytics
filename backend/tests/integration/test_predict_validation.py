from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_predict_endpoint_rejects_malformed_payload():
    payload = {
        "median_income": 5,
        "house_age": 20,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422