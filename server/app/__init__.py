import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .extensions import db

jwt = JWTManager()


def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/seast")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
    app.config["PORT"] = int(os.getenv("PORT", "5001"))
    client_urls = [
        origin.strip()
        for origin in os.getenv("CLIENT_URL", "http://localhost:5173,http://localhost:5174").split(",")
        if origin.strip()
    ]

    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": client_urls}})

    from .routes.activities import activities_bp
    from .routes.analytics import analytics_bp
    from .routes.auth import auth_bp
    from .routes.campaigns import campaigns_bp
    from .routes.quiz import quiz_bp
    from .routes.simulations import simulations_bp
    from .routes.training import training_bp
    from .routes.users import users_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(campaigns_bp, url_prefix="/api/campaigns")
    app.register_blueprint(simulations_bp, url_prefix="/api/simulations")
    app.register_blueprint(training_bp, url_prefix="/api/training")
    app.register_blueprint(quiz_bp, url_prefix="/api/quiz")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(activities_bp, url_prefix="/api/activities")

    @app.route("/api/health")
    def health():
        return jsonify({"ok": True, "service": "SEAST Flask API"})

    with app.app_context():
        db.create_all()

    return app
