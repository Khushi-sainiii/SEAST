from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .extensions import db


campaign_users = Table(
    "campaign_users",
    db.metadata,
    db.Column("campaign_id", db.Integer, db.ForeignKey("campaign.id"), primary_key=True),
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
)

user_assigned_training = Table(
    "user_assigned_training",
    db.metadata,
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
    db.Column("training_module_id", db.Integer, db.ForeignKey("training_module.id"), primary_key=True),
)

user_completed_training = Table(
    "user_completed_training",
    db.metadata,
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
    db.Column("training_module_id", db.Integer, db.ForeignKey("training_module.id"), primary_key=True),
)


class SerializerMixin:
    def to_dict(self):
        raise NotImplementedError


class User(db.Model, SerializerMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(db.String(120), nullable=False)
    email: Mapped[str] = mapped_column(db.String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(db.String(255), nullable=False)
    role: Mapped[str] = mapped_column(db.String(20), default="user")
    department: Mapped[str] = mapped_column(db.String(120), default="General")
    risk_score: Mapped[int] = mapped_column(default=35)
    points: Mapped[int] = mapped_column(default=0)
    badges: Mapped[list] = mapped_column(JSON, default=list)
    quiz_scores: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    assigned_training = relationship("TrainingModule", secondary=user_assigned_training, lazy="joined", overlaps="assigned_users,assigned_training")
    completed_training = relationship("TrainingModule", secondary=user_completed_training, lazy="joined", overlaps="completed_users,completed_training")
    campaigns = relationship("Campaign", secondary=campaign_users, back_populates="assigned_users")

    __table_args__ = (CheckConstraint("risk_score >= 0 AND risk_score <= 100", name="risk_score_between_0_100"),)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "department": self.department,
            "riskScore": self.risk_score,
            "points": self.points,
            "badges": self.badges or [],
            "quizScores": self.quiz_scores or [],
            "assignedTraining": [module.to_dict() for module in self.assigned_training],
            "completedTraining": [module.to_dict() for module in self.completed_training],
            "createdAt": self.created_at.isoformat(),
        }


class TrainingModule(db.Model, SerializerMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(db.String(160), nullable=False)
    category: Mapped[str] = mapped_column(db.String(100), nullable=False)
    duration: Mapped[str] = mapped_column(db.String(60), default="10 min")
    difficulty: Mapped[str] = mapped_column(db.String(40), default="Foundation")
    summary: Mapped[str] = mapped_column(db.Text, default="")
    points: Mapped[int] = mapped_column(default=10)
    content: Mapped[str] = mapped_column(db.Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "duration": self.duration,
            "difficulty": self.difficulty,
            "summary": self.summary,
            "points": self.points,
            "content": self.content,
            "createdAt": self.created_at.isoformat(),
        }


class Campaign(db.Model, SerializerMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(db.String(180), nullable=False)
    type: Mapped[str] = mapped_column(db.String(20), nullable=False)
    subject: Mapped[str] = mapped_column(db.String(180), nullable=False)
    preview: Mapped[str] = mapped_column(db.Text, default="")
    body: Mapped[str] = mapped_column(db.Text, nullable=False)
    tactic: Mapped[str] = mapped_column(db.String(180), default="Social engineering")
    target_training_id: Mapped[Optional[int]] = mapped_column(ForeignKey("training_module.id"))
    status: Mapped[str] = mapped_column(db.String(20), default="draft")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    target_training = relationship("TrainingModule", foreign_keys=[target_training_id], lazy="joined")
    created_by = relationship("User", foreign_keys=[created_by_id], lazy="joined")
    assigned_users = relationship("User", secondary=campaign_users, back_populates="campaigns", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "subject": self.subject,
            "preview": self.preview,
            "body": self.body,
            "tactic": self.tactic,
            "targetTraining": self.target_training.to_dict() if self.target_training else None,
            "assignedUsers": [{"id": user.id, "name": user.name} for user in self.assigned_users],
            "status": self.status,
            "createdBy": {"id": self.created_by.id, "name": self.created_by.name},
            "createdAt": self.created_at.isoformat(),
        }


class Activity(db.Model, SerializerMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    campaign_id: Mapped[Optional[int]] = mapped_column(ForeignKey("campaign.id"))
    type: Mapped[str] = mapped_column(db.String(40), nullable=False)
    target: Mapped[str] = mapped_column(db.String(255), default="")
    detail: Mapped[str] = mapped_column(db.Text, default="")
    risk_delta: Mapped[int] = mapped_column(default=0)
    points_delta: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user = relationship("User", lazy="joined")
    campaign = relationship("Campaign", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "campaignId": self.campaign_id,
            "type": self.type,
            "target": self.target,
            "detail": self.detail,
            "riskDelta": self.risk_delta,
            "pointsDelta": self.points_delta,
            "createdAt": self.created_at.isoformat(),
        }


class RiskHistory(db.Model, SerializerMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    score: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "userId": self.user_id, "score": self.score, "createdAt": self.created_at.isoformat()}


class QuizQuestion(db.Model, SerializerMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    prompt: Mapped[str] = mapped_column(db.Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False)
    correct_answer_index: Mapped[int] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(db.String(100), default="General")
    difficulty: Mapped[str] = mapped_column(db.String(40), default="Foundation")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "prompt": self.prompt,
            "options": self.options,
            "correctAnswerIndex": self.correct_answer_index,
            "category": self.category,
            "difficulty": self.difficulty,
            "createdAt": self.created_at.isoformat(),
        }
