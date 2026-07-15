"""
Coaching Router — AI conversational coaching.

Phase 1: Rule-based responses with health context.
Phase 2: LLM-based coaching via Anthropic Claude API.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class CoachingInput(BaseModel):
    userId: str
    message: str
    history: list[dict] = []
    context: Optional[dict] = None


class CoachingOutput(BaseModel):
    response: str
    suggestions: list[str] = []


@router.post("/chat", response_model=CoachingOutput)
async def coach_chat(data: CoachingInput):
    """
    AI coaching chat endpoint.
    Phase 1: Rule-based responses.
    Phase 2: Will use Anthropic Claude API for conversational coaching.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if api_key and api_key != "your-anthropic-api-key":
        # Phase 2: LLM-based coaching
        return await _llm_coaching(data, api_key)
    else:
        # Phase 1: Rule-based coaching
        return _rule_based_coaching(data)


async def _llm_coaching(data: CoachingInput, api_key: str) -> CoachingOutput:
    """Phase 2: LLM-based coaching using Anthropic Claude API."""
    import httpx
    
    # Build system prompt with user context
    system_prompt = _build_system_prompt(data.context)
    
    # Build message history
    messages = []
    for msg in data.history[-10:]:  # Last 10 messages for context
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })
    messages.append({"role": "user", "content": data.message})
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": os.getenv("AI_MODEL", "claude-sonnet-4-20250514"),
                    "max_tokens": 500,
                    "system": system_prompt,
                    "messages": messages,
                },
                timeout=30.0,
            )
            
            if response.status_code == 200:
                result = response.json()
                assistant_response = result["content"][0]["text"]
                return CoachingOutput(
                    response=assistant_response,
                    suggestions=_generate_suggestions(data.message),
                )
            else:
                # Fallback to rule-based
                return _rule_based_coaching(data)
    except Exception:
        return _rule_based_coaching(data)


def _build_system_prompt(context: Optional[dict]) -> str:
    """Build a contextualized system prompt for the coaching LLM."""
    base = (
        "You are VitalLoop AI Coach, a knowledgeable and empathetic health coach "
        "specializing in diabetes risk management, nutrition, stress management, and wellness. "
        "You provide evidence-based guidance while being warm and supportive. "
        "Keep responses concise (2-3 paragraphs max). "
        "Never provide specific medical diagnoses — recommend consulting healthcare providers for clinical concerns. "
        "Support both English and Arabic languages — respond in the same language as the user's message."
    )
    
    if context:
        glucose_data = context.get("recentGlucose", [])
        if glucose_data:
            values = [r.get("value_mg_dl", 0) for r in glucose_data if r.get("value_mg_dl")]
            if values:
                avg = sum(values) / len(values)
                base += f"\n\nUser's recent glucose average: {avg:.0f} mg/dL ({len(values)} readings)."
                if avg > 140:
                    base += " Note: glucose levels are elevated."
                elif avg < 70:
                    base += " Note: glucose levels appear low."
    
    return base


def _rule_based_coaching(data: CoachingInput) -> CoachingOutput:
    """Phase 1: Rule-based coaching responses."""
    message = data.message.lower()
    
    if any(w in message for w in ["glucose", "sugar", "blood", "a1c", "spike"]):
        response = (
            "Managing blood glucose is a key part of your health journey! Here are some evidence-based tips:\n\n"
            "• **Monitor regularly**: Check fasting glucose in the morning and post-meal readings 2 hours after eating.\n"
            "• **Target ranges**: Fasting: 70-100 mg/dL, Post-meal: under 140 mg/dL.\n"
            "• **Movement helps**: A 15-minute walk after meals can reduce spikes by up to 30%.\n\n"
            "Would you like me to analyze your recent readings or suggest specific strategies?"
        )
        suggestions = ["Show me my glucose trends", "What foods spike my glucose?", "How can I lower my fasting glucose?"]
    
    elif any(w in message for w in ["food", "eat", "meal", "diet", "nutrition", "recipe", "carb"]):
        response = (
            "Nutrition plays a crucial role in managing your health! Here's what I recommend:\n\n"
            "• **Balance your plate**: ½ vegetables, ¼ lean protein, ¼ complex carbs.\n"
            "• **Watch portions**: Use the hand-size method — palm for protein, fist for carbs, cupped hand for fats.\n"
            "• **Pair wisely**: Combine carbs with protein or healthy fats to slow glucose absorption.\n\n"
            "Would you like specific meal ideas or help analyzing a recent meal?"
        )
        suggestions = ["Suggest a low-GI breakfast", "What are good snacks for diabetes?", "Analyze my last meal"]
    
    elif any(w in message for w in ["breath", "stress", "relax", "anxious", "calm", "meditat"]):
        response = (
            "Stress management is crucial — stress hormones like cortisol can directly raise blood glucose! "
            "Here's how breathing can help:\n\n"
            "• **Box Breathing**: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4-6 times.\n"
            "• **Post-meal breathing**: After high-carb meals, 5 minutes of paced breathing can help.\n"
            "• **Before bed**: Sleep-prep breathing improves sleep quality, which helps glucose regulation.\n\n"
            "Would you like to start a guided session now?"
        )
        suggestions = ["Start a breathing session", "How does stress affect glucose?", "Help me sleep better"]
    
    elif any(w in message for w in ["weight", "exercise", "activity", "walk", "workout", "fitness"]):
        response = (
            "Physical activity is one of the most powerful tools for health management!\n\n"
            "• **Daily movement**: Aim for 7,000+ steps per day.\n"
            "• **Post-meal walks**: Even 10-15 minutes after eating can significantly reduce glucose spikes.\n"
            "• **Resistance training**: Building muscle improves insulin sensitivity long-term.\n"
            "• **Consistency > intensity**: Regular moderate exercise beats occasional intense workouts.\n\n"
            "Would you like help creating an activity plan?"
        )
        suggestions = ["Create a walking plan", "Track my activity", "Show my weight trends"]
    
    elif any(w in message for w in ["sleep", "tired", "insomnia", "rest"]):
        response = (
            "Sleep is a vital pillar of health that directly affects glucose regulation!\n\n"
            "• **Aim for 7-9 hours**: Poor sleep increases insulin resistance and hunger hormones.\n"
            "• **Consistent schedule**: Go to bed and wake up at the same time daily.\n"
            "• **Evening routine**: Try a sleep-preparation breathing session 30 minutes before bed.\n"
            "• **Limit screens**: Blue light from devices can disrupt melatonin production.\n\n"
            "Would you like to start a sleep-preparation breathing session?"
        )
        suggestions = ["Start sleep breathing", "How does sleep affect glucose?", "Help me build a bedtime routine"]
    
    else:
        response = (
            "I'm your VitalLoop health coach! 🫀 I'm here to help you with:\n\n"
            "• **Glucose management** — Understanding your readings and trends\n"
            "• **Nutrition guidance** — Meal planning and food analysis\n"
            "• **Breathing exercises** — Stress reduction and glucose correlation\n"
            "• **Weight & activity** — Movement plans and tracking\n"
            "• **Sleep optimization** — Better rest for better health\n\n"
            "What would you like to focus on today?"
        )
        suggestions = ["Check my risk score", "Log a meal", "Start breathing", "Show my dashboard"]
    
    return CoachingOutput(response=response, suggestions=suggestions)


def _generate_suggestions(message: str) -> list[str]:
    """Generate contextual follow-up suggestions."""
    return [
        "Tell me more about my health trends",
        "What should I eat next?",
        "Start a breathing session",
    ]
