from flask import Blueprint, jsonify

from ..auth import require_auth
from ..models import Activity

activities_bp = Blueprint("activities", __name__)


@activities_bp.get("")
@require_auth
def activities(user):
    query = Activity.query.order_by(Activity.created_at.desc()).limit(200)
    if user.role != "admin":
        query = Activity.query.filter_by(user_id=user.id).order_by(Activity.created_at.desc()).limit(200)
    return jsonify({"activities": [activity.to_dict() for activity in query.all()]})
