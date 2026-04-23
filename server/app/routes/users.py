from werkzeug.security import generate_password_hash

from flask import Blueprint, jsonify, request

from ..auth import require_role
from ..extensions import db
from ..models import RiskHistory, User

users_bp = Blueprint("users", __name__)


@users_bp.get("")
@require_role("admin")
def list_users(admin_user):
    return jsonify({"users": [user.to_dict() for user in User.query.order_by(User.created_at.desc()).all()]})


@users_bp.get("/<int:user_id>")
@require_role("admin")
def get_user(admin_user, user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({"user": user.to_dict()})


@users_bp.post("")
@require_role("admin")
def create_user(admin_user):
    payload = request.get_json() or {}
    if not payload.get("name") or not payload.get("email") or not payload.get("password"):
        return jsonify({"message": "Name, email, and password are required"}), 400
    user = User(
        name=payload["name"].strip(),
        email=payload["email"].strip().lower(),
        password_hash=generate_password_hash(payload["password"]),
        role=payload.get("role", "user"),
        department=payload.get("department", "General"),
        risk_score=int(payload.get("riskScore", 35)),
        points=int(payload.get("points", 0)),
        badges=[],
        quiz_scores=[],
    )
    db.session.add(user)
    db.session.commit()
    db.session.add(RiskHistory(user_id=user.id, score=user.risk_score))
    db.session.commit()
    return jsonify({"user": user.to_dict()}), 201


@users_bp.put("/<int:user_id>")
@require_role("admin")
def update_user(admin_user, user_id):
    user = User.query.get_or_404(user_id)
    payload = request.get_json() or {}
    for attr, key in [("name", "name"), ("email", "email"), ("role", "role"), ("department", "department")]:
        if key in payload:
            setattr(user, attr, payload[key].strip() if isinstance(payload[key], str) else payload[key])
    if "riskScore" in payload:
        user.risk_score = int(payload["riskScore"])
    if "points" in payload:
        user.points = int(payload["points"])
    if payload.get("password"):
        user.password_hash = generate_password_hash(payload["password"])
    db.session.commit()
    return jsonify({"user": user.to_dict()})


@users_bp.delete("/<int:user_id>")
@require_role("admin")
def delete_user(admin_user, user_id):
    if admin_user.id == user_id:
        return jsonify({"message": "Admins cannot delete their own account"}), 400
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"})
