from flask import Blueprint, jsonify

from ..auth import require_auth
from ..extensions import db
from ..models import Activity, Campaign
from ..services import find_relevant_training, heuristic_ai_summary, record_activity

simulations_bp = Blueprint("simulations", __name__)


def campaign_list(user, simulation_type):
    campaigns = Campaign.query.filter_by(type=simulation_type).order_by(Campaign.created_at.desc()).all()
    if user.role == "admin":
        return campaigns
    return [campaign for campaign in campaigns if campaign.status == "active" and any(assigned.id == user.id for assigned in campaign.assigned_users)]


@simulations_bp.get("/email")
@require_auth
def email_simulations(user):
    return jsonify({"simulations": [campaign.to_dict() for campaign in campaign_list(user, "email")]})


@simulations_bp.get("/sms")
@require_auth
def sms_simulations(user):
    return jsonify({"simulations": [campaign.to_dict() for campaign in campaign_list(user, "sms")]})


def already_recorded(user, campaign, action_type):
    return Activity.query.filter_by(user_id=user.id, campaign_id=campaign.id, type=action_type).first()


def handle_action(user, campaign_id, action_type):
    campaign = Campaign.query.get_or_404(campaign_id)
    if user.role != "admin" and user.id not in [assigned.id for assigned in campaign.assigned_users]:
        return jsonify({"message": "This simulation is not assigned to you"}), 403
    if already_recorded(user, campaign, action_type):
        return jsonify({
            "user": user.to_dict(),
            "warning": "This simulation action was already recorded. Review the warning signs and continue learning."
        })

    training = find_relevant_training(campaign, "phishing" if action_type == "credentials" else campaign.type)
    if action_type in {"click", "credentials"} and training and training not in user.assigned_training:
        user.assigned_training.append(training)
        db.session.commit()
    activity = record_activity(
        user,
        action_type,
        target=campaign.subject,
        detail={
            "click": "Clicked an educational social engineering simulation link.",
            "report": "Reported an educational social engineering simulation.",
            "credentials": "Submitted credentials to an educational simulation. No credential values were stored."
        }[action_type],
        campaign=campaign,
    )
    return jsonify({
        "activity": activity.to_dict(),
        "user": user.to_dict(),
        "warning": "Good catch. Reporting suspicious messages protects the organization." if action_type == "report" else "Educational simulation only. Review the warning signs and complete the assigned training.",
        "aiInsight": heuristic_ai_summary(user),
    })


@simulations_bp.post("/<int:campaign_id>/click")
@require_auth
def click(user, campaign_id):
    return handle_action(user, campaign_id, "click")


@simulations_bp.post("/<int:campaign_id>/report")
@require_auth
def report(user, campaign_id):
    return handle_action(user, campaign_id, "report")


@simulations_bp.post("/<int:campaign_id>/credentials")
@require_auth
def credentials(user, campaign_id):
    return handle_action(user, campaign_id, "credentials")
