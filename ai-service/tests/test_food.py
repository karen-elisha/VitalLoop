import pytest
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_food_analysis():
    payload = {
        "userId": "test-user",
        "mealType": "lunch",
        "items": [
            {"foodName": "Apple", "carbsG": 21, "giIndex": 36},
            {"foodName": "White Bread", "carbsG": 30, "giIndex": 75}
        ],
        "totals": {
            "carbs_g": 51,
            "calories": 200
        }
    }
    
    response = client.post("/api/food/analyze", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "glucoseImpact" in data
    
    impact = data["glucoseImpact"]
    assert impact in ["low", "medium", "high", "critical"]
