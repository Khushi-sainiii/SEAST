from flask import Blueprint, jsonify, request

from ..auth import require_auth, require_role
from ..extensions import db
from ..integrations import queue_campaign_delivery
from ..models import Campaign, TrainingModule, User

campaigns_bp = Blueprint("campaigns", __name__)


def apply_campaign_payload(campaign, payload, actor):
    campaign.name = payload.get("name", campaign.name)
    campaign.type = payload.get("type", campaign.type)
    campaign.subject = payload.get("subject", campaign.subject)
    campaign.preview = payload.get("preview", campaign.preview or "")
    campaign.body = payload.get("body", campaign.body)
    campaign.tactic = payload.get("tactic", campaign.tactic or "Social engineering")
    campaign.status = payload.get("status", campaign.status or "draft")
    if payload.get("targetTraining"):
        campaign.target_training = TrainingModule.query.get(int(payload["targetTraining"]))
    elif "targetTraining" in payload:
        campaign.target_training = None
    if "assignedUsers" in payload:
        ids = [int(user_id) for user_id in payload.get("assignedUsers", [])]
        campaign.assigned_users = User.query.filter(User.id.in_(ids)).all() if ids else []
    if campaign.created_by is None:
        campaign.created_by = actor


@campaigns_bp.get("")
@require_auth
def list_campaigns(user):
    query = Campaign.query.order_by(Campaign.created_at.desc())
    campaigns = query.all() if user.role == "admin" else [c for c in query.all() if c.status == "active" and any(u.id == user.id for u in c.assigned_users)]
    return jsonify({"campaigns": [campaign.to_dict() for campaign in campaigns]})


@campaigns_bp.get("/<int:campaign_id>")
@require_auth
def get_campaign(user, campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    if user.role != "admin" and user.id not in [assigned.id for assigned in campaign.assigned_users]:
        return jsonify({"message": "Campaign is not assigned to you"}), 403
    return jsonify({"campaign": campaign.to_dict()})


@campaigns_bp.post("")
@require_role("admin")
def create_campaign(admin_user):
    payload = request.get_json() or {}
    campaign = Campaign(created_by=admin_user, name=payload.get("name", ""), type=payload.get("type", "email"), subject=payload.get("subject", ""), body=payload.get("body", ""))
    apply_campaign_payload(campaign, payload, admin_user)
    db.session.add(campaign)
    db.session.commit()
    return jsonify({"campaign": campaign.to_dict(), "delivery": queue_campaign_delivery(campaign)}), 201


@campaigns_bp.put("/<int:campaign_id>")
@require_role("admin")
def update_campaign(admin_user, campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    apply_campaign_payload(campaign, request.get_json() or {}, admin_user)
    db.session.commit()
    return jsonify({"campaign": campaign.to_dict(), "delivery": queue_campaign_delivery(campaign)})


@campaigns_bp.delete("/<int:campaign_id>")
@require_role("admin")
def delete_campaign(admin_user, campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    db.session.delete(campaign)
    db.session.commit()
    return jsonify({"message": "Campaign deleted"})
