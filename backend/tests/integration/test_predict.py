def test_predict_endpoint(client):
    payload = {
        "median_income": 5,
        "house_age": 20,
        "avg_rooms": 5,
        "avg_bedrooms": 1,
        "population": 1000,
        "avg_occupancy": 3,
        "latitude": 34.05,
        "longitude": -118.25,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    assert "predicted_price" in response.json()