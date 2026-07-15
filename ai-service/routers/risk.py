"""
Phase 1: Rule-Based Risk Scoring Engine

Clinical decision tree for diabetes risk assessment.
Transparent, explainable logic — every score component is traceable.

SaMD Classification Note: This module implements clinical decision support logic.
For regulatory purposes, all scoring rules are documented and version-controlled.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class GlucoseReading(BaseModel):
    value_mg_dl: float
    reading_type: str
    measured_at: Optional[str] = None


class RiskInput(BaseModel):
    userId: str
    glucoseReadings: list[dict] = []
    recentMeals: list[dict] = []
    activity: Optional[dict] = None
    breathingSessions: int = 0


class RiskOutput(BaseModel):
    riskLevel: str  # low, medium, high, critical
    riskScore: float  # 0-100
    factors: list[dict]
    actions: list[str]
    explanation: str
    predictionType: str


@router.post("/score", response_model=RiskOutput)
async def compute_risk_score(data: RiskInput):
    """
    Compute comprehensive risk score using Phase 1 rule-based engine.
    
    Scoring components (total = 100):
    - Glucose patterns: 0-40 points
    - Dietary patterns: 0-25 points
    - Activity/lifestyle: 0-20 points
    - Stress/breathing adherence: 0-15 points
    """
    score = 0.0
    factors = []
    actions = []

    # --- Glucose Pattern Analysis (0-40 points) ---
    glucose_score = 0
    glucose_values = [r.get("value_mg_dl", 0) for r in data.glucoseReadings if r.get("value_mg_dl")]

    if glucose_values:
        avg_glucose = sum(glucose_values) / len(glucose_values)
        max_glucose = max(glucose_values)
        min_glucose = min(glucose_values)
        variability = max_glucose - min_glucose

        # Fasting glucose risk
        fasting_values = [
            r.get("value_mg_dl", 0) for r in data.glucoseReadings 
            if r.get("reading_type") == "fasting" and r.get("value_mg_dl")
        ]
        if fasting_values:
            avg_fasting = sum(fasting_values) / len(fasting_values)
            if avg_fasting > 126:
                glucose_score += 15
                factors.append({
                    "category": "glucose",
                    "factor": "Elevated fasting glucose",
                    "detail": f"Average fasting glucose: {avg_fasting:.0f} mg/dL (target: <100 mg/dL)",
                    "severity": "high",
                })
                actions.append("Schedule an appointment with your healthcare provider to discuss fasting glucose levels")
            elif avg_fasting > 100:
                glucose_score += 8
                factors.append({
                    "category": "glucose",
                    "factor": "Pre-diabetic fasting glucose",
                    "detail": f"Average fasting glucose: {avg_fasting:.0f} mg/dL (target: <100 mg/dL)",
                    "severity": "medium",
                })
                actions.append("Consider reducing evening carbohydrate intake")

        # Post-meal glucose risk
        post_meal_values = [
            r.get("value_mg_dl", 0) for r in data.glucoseReadings 
            if r.get("reading_type") == "post_meal" and r.get("value_mg_dl")
        ]
        if post_meal_values:
            avg_post_meal = sum(post_meal_values) / len(post_meal_values)
            if avg_post_meal > 200:
                glucose_score += 15
                factors.append({
                    "category": "glucose",
                    "factor": "High post-meal glucose spikes",
                    "detail": f"Average post-meal: {avg_post_meal:.0f} mg/dL (target: <140 mg/dL)",
                    "severity": "high",
                })
                actions.append("Try a 10-15 minute walk after meals to reduce glucose spikes")
                actions.append("Consider post-meal breathing exercises")
            elif avg_post_meal > 140:
                glucose_score += 8
                factors.append({
                    "category": "glucose",
                    "factor": "Elevated post-meal glucose",
                    "detail": f"Average post-meal: {avg_post_meal:.0f} mg/dL (target: <140 mg/dL)",
                    "severity": "medium",
                })

        # Glucose variability
        if variability > 100:
            glucose_score += 10
            factors.append({
                "category": "glucose",
                "factor": "High glucose variability",
                "detail": f"Range: {variability:.0f} mg/dL — significant fluctuation detected",
                "severity": "medium",
            })
            actions.append("Focus on consistent meal timing and portion sizes")
    else:
        glucose_score += 5
        factors.append({
            "category": "glucose",
            "factor": "Insufficient glucose data",
            "detail": "No recent glucose readings available for analysis",
            "severity": "info",
        })
        actions.append("Log your glucose readings regularly for better insights")

    score += min(glucose_score, 40)

    # --- Dietary Pattern Analysis (0-25 points) ---
    dietary_score = 0
    
    if data.recentMeals:
        total_carbs = sum(m.get("total_carbs_g", 0) or 0 for m in data.recentMeals)
        avg_carbs_per_meal = total_carbs / len(data.recentMeals) if data.recentMeals else 0

        if avg_carbs_per_meal > 80:
            dietary_score += 15
            factors.append({
                "category": "diet",
                "factor": "High carbohydrate intake",
                "detail": f"Average {avg_carbs_per_meal:.0f}g carbs per meal (recommended: <45-60g)",
                "severity": "medium",
            })
            actions.append("Try reducing portion sizes of rice, bread, and pasta")
        elif avg_carbs_per_meal > 60:
            dietary_score += 8
            factors.append({
                "category": "diet",
                "factor": "Moderate-high carbohydrate intake",
                "detail": f"Average {avg_carbs_per_meal:.0f}g carbs per meal",
                "severity": "low",
            })

        # Check meal regularity
        if len(data.recentMeals) < 2:
            dietary_score += 10
            factors.append({
                "category": "diet",
                "factor": "Irregular meal logging",
                "detail": "Few meals logged recently — may indicate irregular eating patterns",
                "severity": "low",
            })
            actions.append("Log all meals to get better dietary insights")
    else:
        dietary_score += 5
        actions.append("Start logging your meals to receive dietary guidance")

    score += min(dietary_score, 25)

    # --- Activity & Lifestyle (0-20 points) ---
    activity_score = 0
    
    if data.activity:
        steps = data.activity.get("steps", 0) or 0
        sleep_hours = data.activity.get("sleep_hours", 0) or 0
        stress_level = data.activity.get("stress_level", 0) or 0

        if steps < 3000:
            activity_score += 10
            factors.append({
                "category": "activity",
                "factor": "Low physical activity",
                "detail": f"{steps} steps today (recommended: >7,000)",
                "severity": "medium",
            })
            actions.append("Aim for a 30-minute walk today")
        elif steps < 7000:
            activity_score += 5
            factors.append({
                "category": "activity",
                "factor": "Below-target activity",
                "detail": f"{steps} steps today (recommended: >7,000)",
                "severity": "low",
            })

        if sleep_hours < 6:
            activity_score += 10
            factors.append({
                "category": "lifestyle",
                "factor": "Insufficient sleep",
                "detail": f"{sleep_hours:.1f} hours (recommended: 7-9 hours)",
                "severity": "medium",
            })
            actions.append("Try a sleep-preparation breathing session tonight")
        
        if stress_level > 7:
            activity_score += 5
            factors.append({
                "category": "lifestyle",
                "factor": "High stress level",
                "detail": f"Reported stress: {stress_level}/10",
                "severity": "medium",
            })
            actions.append("Consider a calming breathing exercise")
    else:
        activity_score += 5

    score += min(activity_score, 20)

    # --- Stress & Breathing Adherence (0-15 points) ---
    breathing_score = 0
    
    if data.breathingSessions < 1:
        breathing_score += 10
        factors.append({
            "category": "breathing",
            "factor": "No breathing sessions this week",
            "detail": "Regular breathing exercises help manage stress and glucose",
            "severity": "low",
        })
        actions.append("Start with a 3-minute paced breathing session")
    elif data.breathingSessions < 3:
        breathing_score += 5
        factors.append({
            "category": "breathing",
            "factor": "Low breathing adherence",
            "detail": f"{data.breathingSessions} session(s) this week (recommended: 5+)",
            "severity": "low",
        })

    score += min(breathing_score, 15)

    # --- Determine Risk Level ---
    score = min(score, 100)
    
    if score >= 70:
        risk_level = "critical"
        explanation = (
            "Your health indicators show significant risk factors that need attention. "
            "Multiple areas including glucose levels, diet, and lifestyle patterns suggest "
            "elevated diabetes risk. Please consider consulting with your healthcare provider."
        )
    elif score >= 45:
        risk_level = "high"
        explanation = (
            "Several risk factors have been identified. While not immediately critical, "
            "addressing the highlighted factors can significantly improve your health trajectory. "
            "Focus on the recommended actions below."
        )
    elif score >= 25:
        risk_level = "medium"
        explanation = (
            "Some areas could use improvement. Your overall risk is moderate, but "
            "small behavioral changes can make a big difference. Keep up with your "
            "current health routines and work on the suggestions below."
        )
    else:
        risk_level = "low"
        explanation = (
            "Great job! Your health indicators are looking good. Continue with your "
            "current routines and keep monitoring your progress."
        )
    
    if not actions:
        actions.append("Keep up the great work! Continue monitoring your health daily.")

    return RiskOutput(
        riskLevel=risk_level,
        riskScore=round(score, 1),
        factors=factors,
        actions=actions,
        explanation=explanation,
        predictionType="glucose_spike",
    )
