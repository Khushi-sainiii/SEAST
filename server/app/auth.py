from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from .models import User


def current_user():
    identity = get_jwt_identity()
    return User.query.get(int(identity))


def require_auth(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"message": "Invalid session"}), 401
        return fn(user, *args, **kwargs)

    return wrapper


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user:
                return jsonify({"message": "Invalid session"}), 401
            if user.role not in roles:
                return jsonify({"message": "You do not have permission to perform this action"}), 403
            return fn(user, *args, **kwargs)

        return wrapper

    return decorator
