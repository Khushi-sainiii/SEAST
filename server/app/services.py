from datetime import datetime

from .extensions import db
from .models import Activity, RiskHistory, TrainingModule

SCORING = {
    "click": {"risk": 10, "points": -10},
    "credentials": {"risk": 30, "points": -10},
    "report": {"risk": -15, "points": 20},
    "training": {"risk": -5, "points": 10},
}


def clamp_score(value):
    return max(0, min(100, value))


def add_badge(user, badge):
    badges = list(user.badges or [])
    if badge not in badges:
        badges.append(badge)
        user.badges = badges


def heuristic_ai_summary(user):
    if user.risk_score >= 70:
        return {"priority": "high", "message": "High-risk users should receive immediate phishing and credential safety coaching."}
    if user.risk_score >= 40:
        return {"priority": "medium", "message": "Moderate-risk users benefit from reinforcement training and follow-up simulations."}
    return {"priority": "low", "message": "Low-risk users are improving; continue with periodic reinforcement."}


def find_relevant_training(campaign=None, fallback=None):
    if campaign and campaign.target_training:
        return campaign.target_training
    term = (fallback or getattr(campaign, "type", None) or "phishing").lower()
    modules = TrainingModule.query.all()
    for module in modules:
        haystack = f"{module.title} {module.category}".lower()
        if term in haystack:
            return module
    return modules[0] if modules else None


def record_activity(user, action_type, target="", detail="", campaign=None, quiz_score=None):
    risk_delta = 0
    points_delta = 0
    if action_type in SCORING:
        risk_delta = SCORING[action_type]["risk"]
        points_delta = SCORING[action_type]["points"]
    elif action_type == "quiz":
        if quiz_score is not None and quiz_score >= 80:
            risk_delta = -10
            points_delta = 25
            add_badge(user, "Quiz Ace")
        elif quiz_score is not None and quiz_score < 50:
            risk_delta = 5

    user.risk_score = clamp_score((user.risk_score or 0) + risk_delta)
    user.points = max(0, (user.points or 0) + points_delta)

    if action_type == "report":
        add_badge(user, "Threat Reporter")
    if action_type == "training":
        add_badge(user, "Security Aware")
    if action_type == "credentials":
        add_badge(user, "High Priority Training")
    if user.points >= 250:
        add_badge(user, "Point Leader")
    if user.risk_score <= 20:
        add_badge(user, "Low Risk Defender")

    activity = Activity(
        user_id=user.id,
        campaign_id=campaign.id if campaign else None,
        type=action_type,
        target=target,
        detail=detail,
        risk_delta=risk_delta,
        points_delta=points_delta,
        created_at=datetime.utcnow(),
    )
    history = RiskHistory(user_id=user.id, score=user.risk_score, created_at=datetime.utcnow())
    db.session.add(activity)
    db.session.add(history)
    db.session.commit()
    return activity
