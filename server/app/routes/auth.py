from werkzeug.security import check_password_hash, generate_password_hash

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token

from ..auth import require_auth
from ..extensions import db
from ..models import RiskHistory, User

auth_bp = Blueprint("auth", __name__)
PASSWORD_HASH_METHOD = "pbkdf2:sha256"


@auth_bp.post("/register")
def register():
    payload = request.get_json() or {}
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    role = payload.get("role", "user")
    department = payload.get("department", "General").strip() or "General"
    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "An account with this email already exists"}), 409

    users_count = User.query.count()
    admins_count = User.query.filter_by(role="admin").count()
    allowed_role = role if users_count == 0 or admins_count == 0 else "user"
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password, method=PASSWORD_HASH_METHOD),
        role="admin" if allowed_role == "admin" else "user",
        department=department,
        risk_score=10 if allowed_role == "admin" else 35,
        points=50 if allowed_role == "admin" else 0,
        badges=["Platform Admin"] if allowed_role == "admin" else [],
        quiz_scores=[],
    )
    db.session.add(user)
    db.session.commit()
    db.session.add(RiskHistory(user_id=user.id, score=user.risk_score))
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json() or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials"}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.get("/me")
@require_auth
def me(user):
    return jsonify({"user": user.to_dict()})
