from flask import Blueprint, jsonify, request

from ..auth import require_auth, require_role
from ..extensions import db
from ..models import TrainingModule
from ..services import record_activity

training_bp = Blueprint("training", __name__)


@training_bp.get("")
@require_auth
def list_training(user):
    return jsonify({"modules": [module.to_dict() for module in TrainingModule.query.order_by(TrainingModule.created_at.desc()).all()]})


@training_bp.post("")
@require_role("admin")
def create_training(admin_user):
    payload = request.get_json() or {}
    module = TrainingModule(
        title=payload.get("title", ""),
        category=payload.get("category", ""),
        duration=payload.get("duration", "10 min"),
        difficulty=payload.get("difficulty", "Foundation"),
        summary=payload.get("summary", ""),
        points=int(payload.get("points", 10)),
        content=payload.get("content", ""),
    )
    db.session.add(module)
    db.session.commit()
    return jsonify({"module": module.to_dict()}), 201


@training_bp.put("/<int:module_id>")
@require_role("admin")
def update_training(admin_user, module_id):
    module = TrainingModule.query.get_or_404(module_id)
    payload = request.get_json() or {}
    for field in ["title", "category", "duration", "difficulty", "summary", "content"]:
        if field in payload:
            setattr(module, field, payload[field])
    if "points" in payload:
        module.points = int(payload["points"])
    db.session.commit()
    return jsonify({"module": module.to_dict()})


@training_bp.delete("/<int:module_id>")
@require_role("admin")
def delete_training(admin_user, module_id):
    module = TrainingModule.query.get_or_404(module_id)
    db.session.delete(module)
    db.session.commit()
    return jsonify({"message": "Training module deleted"})


@training_bp.post("/<int:module_id>/complete")
@require_auth
def complete_training(user, module_id):
    module = TrainingModule.query.get_or_404(module_id)
    if module not in user.completed_training:
        user.completed_training.append(module)
    if module in user.assigned_training:
        user.assigned_training.remove(module)
    db.session.commit()
    activity = record_activity(user, "training", target=module.title, detail=f"Completed {module.title} training.")
    return jsonify({"activity": activity.to_dict(), "user": user.to_dict()})
