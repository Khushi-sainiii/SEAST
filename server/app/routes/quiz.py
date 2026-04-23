from flask import Blueprint, jsonify, request

from ..auth import require_auth, require_role
from ..extensions import db
from ..models import QuizQuestion
from ..services import record_activity

quiz_bp = Blueprint("quiz", __name__)


@quiz_bp.get("")
@require_auth
def list_questions(user):
    return jsonify({"questions": [question.to_dict() for question in QuizQuestion.query.order_by(QuizQuestion.created_at.desc()).all()]})


@quiz_bp.post("/questions")
@require_role("admin")
def create_question(admin_user):
    payload = request.get_json() or {}
    options = payload.get("options") or []
    if len(options) < 2:
        return jsonify({"message": "At least two options are required"}), 400
    question = QuizQuestion(
        prompt=payload.get("prompt", ""),
        options=options,
        correct_answer_index=int(payload.get("correctAnswerIndex", 0)),
        category=payload.get("category", "General"),
        difficulty=payload.get("difficulty", "Foundation"),
    )
    db.session.add(question)
    db.session.commit()
    return jsonify({"question": question.to_dict()}), 201


@quiz_bp.put("/questions/<int:question_id>")
@require_role("admin")
def update_question(admin_user, question_id):
    question = QuizQuestion.query.get_or_404(question_id)
    payload = request.get_json() or {}
    for field, key in [("prompt", "prompt"), ("category", "category"), ("difficulty", "difficulty")]:
        if key in payload:
            setattr(question, field, payload[key])
    if "options" in payload:
        question.options = payload["options"]
    if "correctAnswerIndex" in payload:
        question.correct_answer_index = int(payload["correctAnswerIndex"])
    db.session.commit()
    return jsonify({"question": question.to_dict()})


@quiz_bp.delete("/questions/<int:question_id>")
@require_role("admin")
def delete_question(admin_user, question_id):
    question = QuizQuestion.query.get_or_404(question_id)
    db.session.delete(question)
    db.session.commit()
    return jsonify({"message": "Quiz question deleted"})


@quiz_bp.post("/submit")
@require_auth
def submit_quiz(user):
    payload = request.get_json() or {}
    answers = {str(item.get("questionId")): int(item.get("answerIndex", -1)) for item in payload.get("answers", [])}
    questions = QuizQuestion.query.all()
    if not questions:
        return jsonify({"message": "No quiz questions are available"}), 400
    correct = sum(1 for question in questions if answers.get(str(question.id)) == question.correct_answer_index)
    score = round((correct / len(questions)) * 100)
    scores = list(user.quiz_scores or [])
    scores.append({"score": score, "total": 100, "category": "General", "createdAt": __import__("datetime").datetime.utcnow().isoformat()})
    user.quiz_scores = scores
    db.session.commit()
    activity = record_activity(user, "quiz", target="Awareness quiz", detail=f"Submitted quiz with {score}% score.", quiz_score=score)
    return jsonify({"score": score, "correct": correct, "total": len(questions), "activity": activity.to_dict(), "user": user.to_dict()})
