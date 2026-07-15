"""
Anomaly Detection Router — Time-series anomaly detection on glucose/activity data.

Phase 3: Isolation Forest for detecting unusual patterns.
Currently provides a rule-based anomaly detection stub.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class AnomalyInput(BaseModel):
    userId: str
    dataType: str  # glucose, activity, weight
    values: list[dict]


class AnomalyOutput(BaseModel):
    anomaliesDetected: bool
    anomalies: list[dict]
    summary: str


@router.post("/detect", response_model=AnomalyOutput)
async def detect_anomalies(data: AnomalyInput):
    """
    Detect anomalies in time-series health data.
    
    Phase 1: Simple statistical outlier detection (mean ± 2 standard deviations).
    Phase 3: Will use Isolation Forest or similar ML-based anomaly detection.
    """
    if not data.values:
        return AnomalyOutput(
            anomaliesDetected=False,
            anomalies=[],
            summary="No data provided for anomaly detection.",
        )

    # Extract numeric values
    if data.dataType == "glucose":
        numeric_values = [v.get("value_mg_dl", 0) for v in data.values if v.get("value_mg_dl")]
    elif data.dataType == "weight":
        numeric_values = [v.get("weight_kg", 0) for v in data.values if v.get("weight_kg")]
    else:
        numeric_values = [v.get("value", 0) for v in data.values if v.get("value")]

    if len(numeric_values) < 3:
        return AnomalyOutput(
            anomaliesDetected=False,
            anomalies=[],
            summary="Insufficient data for anomaly detection (need at least 3 data points).",
        )

    # Simple statistical anomaly detection
    import numpy as np

    arr = np.array(numeric_values)
    mean = np.mean(arr)
    std = np.std(arr)
    
    if std == 0:
        return AnomalyOutput(
            anomaliesDetected=False,
            anomalies=[],
            summary="No variation in data — no anomalies detected.",
        )

    anomalies = []
    for i, val in enumerate(numeric_values):
        z_score = abs(val - mean) / std
        if z_score > 2:
            anomalies.append({
                "index": i,
                "value": val,
                "zScore": round(z_score, 2),
                "direction": "high" if val > mean else "low",
                "severity": "critical" if z_score > 3 else "warning",
                "timestamp": data.values[i].get("measured_at") or data.values[i].get("logged_at"),
            })

    if anomalies:
        summary = f"Detected {len(anomalies)} anomalous reading(s) in your {data.dataType} data. "
        critical = [a for a in anomalies if a["severity"] == "critical"]
        if critical:
            summary += f"{len(critical)} critical anomaly(ies) require attention."
        else:
            summary += "These appear to be moderate deviations from your typical pattern."
    else:
        summary = f"Your {data.dataType} data appears consistent — no anomalies detected."

    return AnomalyOutput(
        anomaliesDetected=len(anomalies) > 0,
        anomalies=anomalies,
        summary=summary,
    )
