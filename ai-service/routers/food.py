"""
Food Analysis Router — Meal analysis and food image recognition.

Phase 1: Rule-based nutritional analysis with glucose impact scoring.
Phase 3 stub: CNN-based food image recognition.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class FoodItem(BaseModel):
    foodName: str
    portionGrams: Optional[float] = None
    calories: Optional[float] = None
    carbsG: Optional[float] = None
    proteinG: Optional[float] = None
    fatG: Optional[float] = None
    fiberG: Optional[float] = None
    giIndex: Optional[int] = None


class MealAnalysisInput(BaseModel):
    userId: str
    mealType: str
    items: list[FoodItem]
    totals: dict


class MealAnalysisOutput(BaseModel):
    glucoseImpact: str  # low, moderate, high
    glucoseImpactScore: float  # 0-100
    insights: list[str]
    recommendations: list[str]
    postMealBreathingRecommended: bool
    estimatedGlucoseRise: Optional[str] = None


@router.post("/analyze", response_model=MealAnalysisOutput)
async def analyze_meal(data: MealAnalysisInput):
    """
    Analyze a meal for glucose impact using rule-based scoring.
    
    Considers: total carbs, glycemic index, fiber content, protein/fat buffering,
    meal type (breakfast tends to have higher glucose response), and portion size.
    """
    total_carbs = data.totals.get("carbs", 0) or 0
    total_fiber = data.totals.get("fiber", 0) or 0
    total_protein = data.totals.get("protein", 0) or 0
    total_fat = data.totals.get("fat", 0) or 0
    total_calories = data.totals.get("calories", 0) or 0

    # Calculate net carbs (carbs minus fiber)
    net_carbs = max(0, total_carbs - total_fiber)

    # Gather GI values
    gi_values = [item.giIndex for item in data.items if item.giIndex is not None and item.giIndex > 0]
    avg_gi = sum(gi_values) / len(gi_values) if gi_values else 55  # default medium GI

    # --- Glucose Impact Scoring ---
    score = 0.0
    insights = []
    recommendations = []

    # Net carb impact (0-40 points)
    if net_carbs > 80:
        score += 40
        insights.append(f"Very high net carbs ({net_carbs:.0f}g) — likely to cause significant glucose rise")
    elif net_carbs > 60:
        score += 30
        insights.append(f"High net carbs ({net_carbs:.0f}g) — may cause moderate-to-high glucose rise")
    elif net_carbs > 40:
        score += 20
        insights.append(f"Moderate net carbs ({net_carbs:.0f}g)")
    elif net_carbs > 20:
        score += 10
        insights.append(f"Low-moderate net carbs ({net_carbs:.0f}g) — good choice")
    else:
        insights.append(f"Low net carbs ({net_carbs:.0f}g) — minimal glucose impact expected")

    # Glycemic index impact (0-25 points)
    if avg_gi > 70:
        score += 25
        insights.append(f"High glycemic index foods (avg GI: {avg_gi:.0f}) — rapid glucose absorption")
        recommendations.append("Consider swapping high-GI foods with lower-GI alternatives (e.g., brown rice instead of white)")
    elif avg_gi > 55:
        score += 15
        insights.append(f"Medium glycemic index (avg GI: {avg_gi:.0f})")
    else:
        score += 5
        insights.append(f"Low glycemic index (avg GI: {avg_gi:.0f}) — slower glucose absorption")

    # Fiber buffering (reduces score, 0-10 points reduction)
    if total_fiber > 10:
        score -= 10
        insights.append(f"Good fiber content ({total_fiber:.0f}g) — helps slow glucose absorption")
    elif total_fiber > 5:
        score -= 5
        insights.append(f"Moderate fiber ({total_fiber:.0f}g)")
    else:
        recommendations.append("Add more fiber-rich foods (vegetables, legumes, whole grains) to slow glucose absorption")

    # Protein/fat buffering (reduces score, 0-10 points reduction)
    protein_fat_ratio = (total_protein + total_fat) / max(total_carbs, 1)
    if protein_fat_ratio > 0.8:
        score -= 10
        insights.append("Good protein/fat-to-carb ratio — helps moderate glucose response")
    elif protein_fat_ratio > 0.4:
        score -= 5
    else:
        recommendations.append("Add protein or healthy fats to help moderate the glucose response")

    # Meal timing factor
    if data.mealType == "breakfast":
        score += 5
        insights.append("Breakfast meals tend to have a higher glucose response (dawn phenomenon)")
    elif data.mealType == "snack" and net_carbs > 30:
        score += 5
        insights.append("High-carb snacks between meals can cause unexpected spikes")

    # Clamp score
    score = max(0, min(100, score))

    # Determine impact level
    if score >= 60:
        glucose_impact = "high"
        estimated_rise = "60-120+ mg/dL above baseline"
        recommendations.append("A 10-15 minute walk after this meal can help reduce the glucose spike by up to 30%")
        recommendations.append("Consider a post-meal breathing session")
    elif score >= 35:
        glucose_impact = "moderate"
        estimated_rise = "30-60 mg/dL above baseline"
    else:
        glucose_impact = "low"
        estimated_rise = "10-30 mg/dL above baseline"

    post_meal_breathing = score >= 50

    if not recommendations:
        recommendations.append("This looks like a balanced meal! Keep it up.")

    return MealAnalysisOutput(
        glucoseImpact=glucose_impact,
        glucoseImpactScore=round(score, 1),
        insights=insights,
        recommendations=recommendations,
        postMealBreathingRecommended=post_meal_breathing,
        estimatedGlucoseRise=estimated_rise,
    )


class FoodRecognitionInput(BaseModel):
    imageBase64: Optional[str] = None
    imageUrl: Optional[str] = None


class FoodRecognitionOutput(BaseModel):
    recognized: bool
    foods: list[dict]
    confidence: float
    message: str


@router.post("/recognize", response_model=FoodRecognitionOutput)
async def recognize_food(data: FoodRecognitionInput):
    """
    Phase 3 stub: Food image recognition using CNN.
    Currently returns mock data. Will be replaced with a pretrained
    food classification model (e.g., Food-101).
    """
    # Stub — return mock recognition result
    return FoodRecognitionOutput(
        recognized=True,
        foods=[
            {
                "name": "Grilled Chicken",
                "confidence": 0.85,
                "calories_est": 165,
                "carbs_est": 0,
                "protein_est": 31,
                "fat_est": 3.6,
            },
            {
                "name": "Rice",
                "confidence": 0.78,
                "calories_est": 130,
                "carbs_est": 28,
                "protein_est": 2.7,
                "fat_est": 0.3,
            },
            {
                "name": "Mixed Vegetables",
                "confidence": 0.72,
                "calories_est": 45,
                "carbs_est": 8,
                "protein_est": 2,
                "fat_est": 0.5,
            },
        ],
        confidence=0.78,
        message="Food recognition is currently in preview mode. Results are estimates — please verify and adjust portions.",
    )
