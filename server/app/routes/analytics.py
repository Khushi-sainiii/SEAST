from collections import Counter

from flask import Blueprint, jsonify

from ..auth import require_auth, require_role
from ..integrations import notification_status
from ..models import Activity, Campaign, RiskHistory, TrainingModule, User
from ..services import heuristic_ai_summary

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.get("/analytics/admin")
@require_role("admin")
def admin_analytics(admin_user):
    users = User.query.all()
    campaigns = Campaign.query.all()
    activities = Activity.query.order_by(Activity.created_at.desc()).limit(300).all()
    modules = TrainingModule.query.all()
    counts = Counter(activity.type for activity in activities)
    avg_risk = round(sum(user.risk_score for user in users) / len(users)) if users else 0
    return jsonify({
        "metrics": {
            "users": len(users),
            "admins": len([user for user in users if user.role == "admin"]),
            "campaigns": len(campaigns),
            "activeCampaigns": len([campaign for campaign in campaigns if campaign.status == "active"]),
            "trainingModules": len(modules),
            "avgRisk": avg_risk,
        },
        "activityBreakdown": [{"name": name, "value": value} for name, value in counts.items()],
        "recentActivities": [activity.to_dict() for activity in activities],
        "providers": notification_status(),
    })


@analytics_bp.get("/analytics/user")
@require_auth
def user_analytics(user):
    activities = Activity.query.filter_by(user_id=user.id).order_by(Activity.created_at.desc()).limit(100).all()
    history = RiskHistory.query.filter_by(user_id=user.id).order_by(RiskHistory.created_at.asc()).all()
    return jsonify({"activities": [activity.to_dict() for activity in activities], "riskHistory": [item.to_dict() for item in history], "aiInsight": heuristic_ai_summary(user)})


@analytics_bp.get("/risk-history/<int:user_id>")
@require_auth
def risk_history(user, user_id):
    if user.role != "admin" and user.id != user_id:
        return jsonify({"message": "You can only view your own risk history"}), 403
    history = RiskHistory.query.filter_by(user_id=user_id).order_by(RiskHistory.created_at.asc()).all()
    return jsonify({"history": [item.to_dict() for item in history]})


@analytics_bp.get("/leaderboard")
@require_auth
def leaderboard(user):
    users = User.query.filter_by(role="user").order_by(User.points.desc(), User.risk_score.asc()).limit(25).all()
    return jsonify({"users": [candidate.to_dict() for candidate in users]})
