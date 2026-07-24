import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_huggingface_coaching_fallback():
    payload = {
        "userId": "test-user-hf",
        "message": "What should I eat to avoid a glucose spike?",
        "history": []
    }
    response = client.post("/api/coaching/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "suggestions" in data
    assert len(data["suggestions"]) > 0

def test_predict_glucose_spike_endpoint():
    payload = {
        "baselineGlucose": 110.0,
        "carbsGrams": 75.0,
        "giIndex": 70,
        "activityLevel": "low",
        "sleepHours": 5.5
    }
    response = client.post("/api/risk/predict-spike", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predictedPeakGlucose" in data
    assert "spikeProbability" in data
    assert "riskCategory" in data
    assert "recommendations" in data
    assert "hfModelUsed" in data
    assert data["predictedPeakGlucose"] > 110.0
    assert data["riskCategory"] in ["low", "moderate", "high"]
