import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_risk_score_low():
    payload = {
        "userId": "test-user-1",
        "glucoseReadings": [],
        "recentMeals": [],
        "activity": {"steps": 10000, "sleep_hours": 8},
        "breathingSessions": 3
    }
    
    response = client.post("/api/risk/score", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "riskLevel" in data
    assert "riskScore" in data
    assert data["riskLevel"] == "low"
    assert data["riskScore"] < 40

def test_risk_score_high():
    payload = {
        "userId": "test-user-2",
        "glucoseReadings": [
            {"value_mg_dl": 180, "reading_type": "fasting"},
            {"value_mg_dl": 210, "reading_type": "post_meal"}
        ],
        "recentMeals": [
            {"carbs_g": 100},
            {"carbs_g": 150}
        ],
        "activity": {"steps": 2000, "sleep_hours": 4},
        "breathingSessions": 0
    }
    
    response = client.post("/api/risk/score", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["riskLevel"] in ["high", "critical"]
    assert data["riskScore"] >= 60
