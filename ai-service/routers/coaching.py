"""
Coaching Router — AI conversational coaching.

Phase 1: Rule-based responses with health context.
Phase 2: LLM-based coaching via Anthropic Claude API.
Phase 3: Hugging Face inference with retrieval using local knowledge and user context.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
import re
import json

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
    Phase 2: LLM-based coaching via Anthropic Claude API.
    Phase 3: RAG-style retrieval using user context and curated health guidance.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    hf_model = os.getenv("HF_MODEL", "microsoft/Phi-3.5-mini-instruct")

    user_context = data.context or {}
    if data.userId:
        user_context = _merge_user_context(user_context, _fetch_user_health_context(data.userId))

    retrieved_context = _retrieve_relevant_context(data.message, user_context)

    if api_key and api_key != "your-anthropic-api-key":
        # Phase 2: LLM-based coaching
        return await _llm_coaching(data, api_key, retrieved_context)

    if os.getenv("USE_HF_MODEL", "true").lower() == "true":
        hf_result = await _huggingface_coaching(data, hf_model, retrieved_context)
        if hf_result:
            return hf_result

    # Phase 1/3: rule-based coaching with retrieval enhancement
    return _rule_based_coaching(data, retrieved_context)


async def _llm_coaching(data: CoachingInput, api_key: str, retrieved_context: list[str]) -> CoachingOutput:
    """Phase 2: LLM-based coaching using Anthropic Claude API with retrieval context."""
    import httpx

    # Build system prompt with user context and retrieved guidance
    system_prompt = _build_system_prompt(data.context, retrieved_context)
    
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
                return _rule_based_coaching(data, retrieved_context)
    except Exception:
        return _rule_based_coaching(data, retrieved_context)


async def _huggingface_coaching(data: CoachingInput, model_name: str, retrieved_context: list[str]) -> Optional[CoachingOutput]:
    """Try to run a Hugging Face model for coaching if dependencies are available."""
    try:
        from transformers import pipeline
    except Exception:
        return None

    try:
        generator = pipeline("text-generation", model=model_name, tokenizer=model_name, device=-1)
    except Exception:
        return None

    prompt = _build_hf_prompt(data.message, retrieved_context, data.context or {})
    try:
        result = generator(prompt, max_new_tokens=180, do_sample=True, temperature=0.8, top_p=0.95)
        text = result[0]["generated_text"]
        response = text.split("Assistant:", 1)[-1].strip() if "Assistant:" in text else text.strip()
        return CoachingOutput(response=response, suggestions=_generate_suggestions(data.message))
    except Exception:
        return None


def _build_hf_prompt(message: str, retrieved_context: Optional[list[str]] = None, context: Optional[dict] = None) -> str:
    """Build a prompt for a Hugging Face instruct model using user context and retrieved snippets."""
    context_summary = _build_context_summary(context)
    glucose_trend = _build_glucose_trend_summary(context)

    prompt_parts = [
        "You are VitalLoop AI Coach, a supportive health coach.",
        "You answer briefly, empathetically, and safely.",
        "Do not give diagnoses; suggest speaking with a healthcare provider for medical concerns.",
        "Respond in the same language as the user.",
    ]

    if context_summary:
        prompt_parts.append("User health context:")
        prompt_parts.extend(f"- {item}" for item in context_summary)

    if glucose_trend:
        prompt_parts.append(f"Glucose trend: {glucose_trend}")

    if retrieved_context:
        prompt_parts.append("Retrieved guidance:")
        prompt_parts.extend(f"- {item}" for item in retrieved_context[:3])

    prompt_parts.append(f"User message: {message}")
    prompt_parts.append("Assistant:")
    return "\n".join(prompt_parts)


def _build_system_prompt(context: Optional[dict], retrieved_context: Optional[list[str]] = None) -> str:
    """Build a contextualized system prompt for the coaching LLM."""
    base = (
        "You are VitalLoop AI Coach, a knowledgeable and empathetic health coach "
        "specializing in diabetes risk management, nutrition, stress management, and wellness. "
        "You provide evidence-based guidance while being warm and supportive. "
        "Keep responses concise (2-3 paragraphs max). "
        "Never provide specific medical diagnoses — recommend consulting healthcare providers for clinical concerns. "
        "Support both English and Arabic languages — respond in the same language as the user's message."
    )

    summaries = _build_context_summary(context)
    glucose_trend = _build_glucose_trend_summary(context)
    if summaries:
        base += "\n\nUser health context:"
        for summary in summaries:
            base += f"\n- {summary}"
    if glucose_trend:
        base += f"\n\nGlucose trend: {glucose_trend}"

    if retrieved_context:
        base += "\n\nRetrieved guidance snippets:"
        for snippet in retrieved_context[:3]:
            base += f"\n- {snippet}"

    return base


def _build_glucose_trend_summary(context: Optional[dict]) -> str:
    """Summarize the user's recent glucose trend from their actual history."""
    if not context:
        return ""

    glucose_data = context.get("recentGlucose", [])
    if not glucose_data:
        return ""

    values = [float(r.get("value_mg_dl", 0)) for r in glucose_data if r.get("value_mg_dl")]
    if not values:
        return ""

    average = sum(values) / len(values)
    latest_value = values[0]
    highest_value = max(values)
    lowest_value = min(values)

    if latest_value > average + 15:
        direction = "rising above your recent average"
    elif latest_value < average - 15:
        direction = "below your recent average"
    else:
        direction = "close to your recent average"

    return f"Latest glucose reading is {latest_value:.0f} mg/dL, which is {direction}; average is {average:.0f} mg/dL over {len(values)} readings with a range of {lowest_value:.0f}-{highest_value:.0f} mg/dL."


def _build_context_summary(context: Optional[dict]) -> list[str]:
    """Create concise human-readable summaries from user health context."""
    if not context:
        return []

    summaries: list[str] = []

    glucose_data = context.get("recentGlucose", [])
    if glucose_data:
        values = [r.get("value_mg_dl", 0) for r in glucose_data if r.get("value_mg_dl")]
        if values:
            avg = sum(values) / len(values)
            latest = glucose_data[0]
            latest_value = latest.get("value_mg_dl") if latest else None
            summaries.append(f"Recent glucose average is {avg:.0f} mg/dL across {len(values)} readings; latest reading is {latest_value} mg/dL.")

    meals = context.get("recentMeals", [])
    if meals:
        latest_meal = meals[0]
        calories = latest_meal.get("total_calories")
        carbs = latest_meal.get("total_carbs_g")
        summaries.append(f"Latest meal was {latest_meal.get('meal_type', 'unknown')} with {calories} calories and {carbs}g carbs.")

    weight_entries = context.get("recentWeight", [])
    if weight_entries:
        latest_weight = weight_entries[0].get("weight_kg")
        summaries.append(f"Latest logged weight is {latest_weight} kg.")

    breathing_sessions = context.get("recentBreathing", [])
    if breathing_sessions:
        latest_session = breathing_sessions[0]
        summaries.append(f"Latest breathing session was {latest_session.get('session_type', 'unknown')} for {latest_session.get('duration_seconds', 0)} seconds.")

    prediction = context.get("latestPrediction")
    if prediction:
        prediction_data = prediction[0] if isinstance(prediction, list) and prediction else None
        if prediction_data:
            summaries.append(f"Latest risk prediction is {prediction_data.get('risk_level', 'unknown')} with score {prediction_data.get('risk_score', 0)}.")

    return summaries


def _merge_user_context(existing_context: Optional[dict], fetched_context: Optional[dict]) -> dict:
    """Merge existing context with fetched health history from the database."""
    merged = dict(existing_context or {})
    if not fetched_context:
        return merged

    for key, value in fetched_context.items():
        if key in merged and isinstance(merged[key], list) and isinstance(value, list):
            merged[key] = value + [item for item in merged[key] if item not in value]
        elif value is not None:
            merged[key] = value

    return merged


def _fetch_user_health_context(user_id: str) -> dict:
    """Pull the user's recent health data directly from PostgreSQL for richer coaching context."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return {}

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(database_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(
            "SELECT value_mg_dl, reading_type, measured_at FROM glucose_readings WHERE user_id = %s ORDER BY measured_at DESC LIMIT 8",
            (user_id,),
        )
        glucose_rows = [dict(row) for row in cur.fetchall()]

        cur.execute(
            "SELECT meal_type, logged_at, total_calories, total_carbs_g, total_protein_g FROM meals WHERE user_id = %s ORDER BY logged_at DESC LIMIT 5",
            (user_id,),
        )
        meal_rows = [dict(row) for row in cur.fetchall()]

        cur.execute(
            "SELECT weight_kg, measured_at FROM weight_entries WHERE user_id = %s ORDER BY measured_at DESC LIMIT 5",
            (user_id,),
        )
        weight_rows = [dict(row) for row in cur.fetchall()]

        cur.execute(
            "SELECT session_type, duration_seconds, completion_status, started_at FROM breathing_sessions WHERE user_id = %s ORDER BY started_at DESC LIMIT 5",
            (user_id,),
        )
        breathing_rows = [dict(row) for row in cur.fetchall()]

        cur.execute(
            "SELECT risk_level, risk_score, explanation, created_at FROM predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            (user_id,),
        )
        prediction_rows = [dict(row) for row in cur.fetchall()]

        cur.close()
        conn.close()

        return {
            "recentGlucose": glucose_rows,
            "recentMeals": meal_rows,
            "recentWeight": weight_rows,
            "recentBreathing": breathing_rows,
            "latestPrediction": prediction_rows,
        }
    except Exception:
        return {}


def _retrieve_relevant_context(message: str, context: Optional[dict]) -> list[str]:
    """Retrieve relevant guidance snippets using lightweight keyword matching."""
    query = (message or "").lower()
    snippets: list[str] = []

    knowledge_base = [
        "For glucose management, monitor fasting and post-meal readings and consider a short walk after meals.",
        "Balanced meals with protein, vegetables, and complex carbohydrates can help reduce glucose spikes.",
        "Stress can raise glucose levels, so breathing exercises and relaxation can be helpful.",
        "Consistent sleep and daily movement support better glucose control and overall wellness.",
        "If glucose values are repeatedly high or low, consider speaking with a healthcare professional.",
    ]

    keyword_map = {
        "glucose": [0, 4],
        "sugar": [0, 4],
        "blood": [0, 4],
        "food": [1],
        "meal": [1],
        "eat": [1],
        "stress": [2],
        "breath": [2],
        "sleep": [3],
        "weight": [3],
        "exercise": [3],
        "walk": [3],
        "activity": [3],
    }

    matched_indices = set()
    for keyword, indexes in keyword_map.items():
        if keyword in query:
            matched_indices.update(indexes)

    if not matched_indices:
        matched_indices = {0, 1, 2, 3}

    for idx in sorted(matched_indices):
        snippets.append(knowledge_base[idx])

    if context:
        recent_glucose = context.get("recentGlucose", [])
        if recent_glucose:
            values = [r.get("value_mg_dl") for r in recent_glucose if r.get("value_mg_dl")]
            if values:
                avg = sum(values) / len(values)
                snippets.append(f"Recent glucose average from provided context: {avg:.0f} mg/dL.")

    return snippets


def _rule_based_coaching(data: CoachingInput, retrieved_context: Optional[list[str]] = None) -> CoachingOutput:
    """Phase 1: Rule-based coaching responses with retrieval enhancement."""
    message = data.message.lower()
    context_block = "\n".join(retrieved_context or []) if retrieved_context else ""
    context = data.context or {}

    if any(w in message for w in ["glucose", "sugar", "blood", "a1c", "spike"]):
        latest_glucose = ""
        glucose_data = context.get("recentGlucose", [])
        if glucose_data:
            latest_entry = glucose_data[0]
            latest_value = latest_entry.get("value_mg_dl")
            if latest_value is not None:
                latest_glucose = f"Your latest glucose reading is {latest_value} mg/dL."

        response = (
            "Managing blood glucose is a key part of your health journey! Here are some evidence-based tips:\n\n"
            "• **Monitor regularly**: Check fasting glucose in the morning and post-meal readings 2 hours after eating.\n"
            "• **Target ranges**: Fasting: 70-100 mg/dL, Post-meal: under 140 mg/dL.\n"
            "• **Movement helps**: A 15-minute walk after meals can reduce spikes by up to 30%.\n"
        )
        if latest_glucose:
            response += f"\n{latest_glucose}\n"
        if context_block:
            response += f"\nRelevant guidance:\n{context_block}\n"
        response += "\nWould you like me to analyze your recent readings or suggest specific strategies?"
        suggestions = ["Show me my glucose trends", "What foods spike my glucose?", "How can I lower my fasting glucose?"]
    
    elif any(w in message for w in ["food", "eat", "meal", "diet", "nutrition", "recipe", "carb"]):
        response = (
            "Nutrition plays a crucial role in managing your health! Here's what I recommend:\n\n"
            "• **Balance your plate**: ½ vegetables, ¼ lean protein, ¼ complex carbs.\n"
            "• **Watch portions**: Use the hand-size method — palm for protein, fist for carbs, cupped hand for fats.\n"
            "• **Pair wisely**: Combine carbs with protein or healthy fats to slow glucose absorption.\n"
        )
        if context_block:
            response += f"\nRelevant guidance:\n{context_block}\n"
        response += "\nWould you like specific meal ideas or help analyzing a recent meal?"
        suggestions = ["Suggest a low-GI breakfast", "What are good snacks for diabetes?", "Analyze my last meal"]
    
    elif any(w in message for w in ["breath", "stress", "relax", "anxious", "calm", "meditat"]):
        response = (
            "Stress management is crucial — stress hormones like cortisol can directly raise blood glucose! "
            "Here's how breathing can help:\n\n"
            "• **Box Breathing**: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4-6 times.\n"
            "• **Post-meal breathing**: After high-carb meals, 5 minutes of paced breathing can help.\n"
            "• **Before bed**: Sleep-prep breathing improves sleep quality, which helps glucose regulation.\n"
        )
        if context_block:
            response += f"\nRelevant guidance:\n{context_block}\n"
        response += "\nWould you like to start a guided session now?"
        suggestions = ["Start a breathing session", "How does stress affect glucose?", "Help me sleep better"]
    
    elif any(w in message for w in ["weight", "exercise", "activity", "walk", "workout", "fitness"]):
        response = (
            "Physical activity is one of the most powerful tools for health management!\n\n"
            "• **Daily movement**: Aim for 7,000+ steps per day.\n"
            "• **Post-meal walks**: Even 10-15 minutes after eating can significantly reduce glucose spikes.\n"
            "• **Resistance training**: Building muscle improves insulin sensitivity long-term.\n"
            "• **Consistency > intensity**: Regular moderate exercise beats occasional intense workouts.\n"
        )
        if context_block:
            response += f"\nRelevant guidance:\n{context_block}\n"
        response += "\nWould you like help creating an activity plan?"
        suggestions = ["Create a walking plan", "Track my activity", "Show my weight trends"]
    
    elif any(w in message for w in ["sleep", "tired", "insomnia", "rest"]):
        response = (
            "Sleep is a vital pillar of health that directly affects glucose regulation!\n\n"
            "• **Aim for 7-9 hours**: Poor sleep increases insulin resistance and hunger hormones.\n"
            "• **Consistent schedule**: Go to bed and wake up at the same time daily.\n"
            "• **Evening routine**: Try a sleep-preparation breathing session 30 minutes before bed.\n"
            "• **Limit screens**: Blue light from devices can disrupt melatonin production.\n"
        )
        if context_block:
            response += f"\nRelevant guidance:\n{context_block}\n"
        response += "\nWould you like to start a sleep-preparation breathing session?"
        suggestions = ["Start sleep breathing", "How does sleep affect glucose?", "Help me build a bedtime routine"]
    
    else:
        response = (
            "I'm your VitalLoop health coach! 🫀 I'm here to help you with:\n\n"
            "• **Glucose management** — Understanding your readings and trends\n"
            "• **Nutrition guidance** — Meal planning and food analysis\n"
            "• **Breathing exercises** — Stress reduction and glucose correlation\n"
            "• **Weight & activity** — Movement plans and tracking\n"
            "• **Sleep optimization** — Better rest for better health\n"
        )
        if context_block:
            response += f"\nRelevant guidance:\n{context_block}\n"
        response += "\nWhat would you like to focus on today?"
        suggestions = ["Check my risk score", "Log a meal", "Start breathing", "Show my dashboard"]
    
    return CoachingOutput(response=response, suggestions=suggestions)


def _generate_suggestions(message: str) -> list[str]:
    """Generate contextual follow-up suggestions."""
    return [
        "Tell me more about my health trends",
        "What should I eat next?",
        "Start a breathing session",
    ]
