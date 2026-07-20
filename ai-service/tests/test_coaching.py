from routers.coaching import _build_context_summary, _build_glucose_trend_summary, _rule_based_coaching, CoachingInput, _build_hf_prompt


def test_build_context_summary_includes_health_history():
    context = {
        "recentGlucose": [
            {"value_mg_dl": 132, "reading_type": "post_meal"},
            {"value_mg_dl": 98, "reading_type": "fasting"},
        ],
        "recentMeals": [
            {"meal_type": "lunch", "total_calories": 438, "total_carbs_g": 37, "total_protein_g": 33.6},
        ],
        "recentWeight": [{"weight_kg": 74.2}],
        "recentBreathing": [{"session_type": "box", "duration_seconds": 300, "completion_status": "completed"}],
        "latestPrediction": [{"risk_level": "medium", "risk_score": 45.0}],
    }

    summaries = _build_context_summary(context)

    assert len(summaries) >= 4
    assert any("glucose" in item.lower() for item in summaries)
    assert any("meal" in item.lower() or "calories" in item.lower() for item in summaries)
    assert any("weight" in item.lower() for item in summaries)


def test_build_glucose_trend_summary_mentions_latest_trend():
    context = {
        "recentGlucose": [
            {"value_mg_dl": 134, "reading_type": "post_meal"},
            {"value_mg_dl": 98, "reading_type": "fasting"},
            {"value_mg_dl": 126, "reading_type": "post_meal"},
        ],
    }

    trend = _build_glucose_trend_summary(context)

    assert "latest" in trend.lower()
    assert "average" in trend.lower()
    assert "mg/dl" in trend.lower()


def test_rule_based_coaching_uses_latest_glucose_context():
    data = CoachingInput(
        userId="user-1",
        message="How is my glucose today?",
        context={
            "recentGlucose": [
                {"value_mg_dl": 134, "reading_type": "post_meal"},
                {"value_mg_dl": 98, "reading_type": "fasting"},
                {"value_mg_dl": 126, "reading_type": "post_meal"},
            ],
        },
    )

    result = _rule_based_coaching(data)

    assert "latest glucose reading" in result.response.lower()
    assert "134" in result.response


def test_build_hf_prompt_includes_user_context_and_message():
    context = {
        "recentGlucose": [
            {"value_mg_dl": 134, "reading_type": "post_meal"},
            {"value_mg_dl": 98, "reading_type": "fasting"},
        ],
    }

    prompt = _build_hf_prompt("How is my glucose today?", ["Keep it concise"], context)

    assert "How is my glucose today?" in prompt
    assert "134" in prompt
    assert "Keep it concise" in prompt
