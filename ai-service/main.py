"""
VitalLoop AI Service — FastAPI microservice for ML/AI capabilities.

Phase 1: Rule-based clinical decision trees (transparent, explainable logic)
Phase 2: LLM-based conversational coaching (Anthropic Claude API)
Phase 3: Custom ML models (scikit-learn / TensorFlow / PyTorch)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="VitalLoop AI Service",
    description="AI/ML microservice for risk scoring, food analysis, and coaching",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers.risk import router as risk_router
from routers.food import router as food_router
from routers.coaching import router as coaching_router
from routers.anomaly import router as anomaly_router

app.include_router(risk_router, prefix="/api/risk", tags=["Risk Assessment"])
app.include_router(food_router, prefix="/api/food", tags=["Food Analysis"])
app.include_router(coaching_router, prefix="/api/coaching", tags=["Coaching"])
app.include_router(anomaly_router, prefix="/api/anomaly", tags=["Anomaly Detection"])


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "vitalloop-ai",
        "version": "1.0.0",
        "phases": {
            "phase1_rules": "active",
            "phase2_llm": "stub",
            "phase3_ml": "stub",
        },
    }
