def test_predict_endpoint_rejects_malformed_payload(client):
    payload = {
        "median_income": 5,
        "house_age": 20,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422