from fastapi import APIRouter, HTTPException

from typing import List
from ..schemas import (
    LessonGenerationRequest,
    LessonResponse,
    EvaluateRequest,
    EvaluateResponse,
    EvaluateDetail,
    FreeCheckRequest,
    FreeCheckResponse,
)
from ..services.llm import generate_lesson, check_free_response


router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.post("/generate", response_model=LessonResponse)
def generate(req: LessonGenerationRequest) -> LessonResponse:
    try:
        lesson, cached = generate_lesson(req)
        return LessonResponse(lesson=lesson, cached=cached)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _norm(s: str | None) -> str:
    return (s or "").strip().lower()


@router.post("/evaluate_answers", response_model=EvaluateResponse)
def evaluate_answers(req: EvaluateRequest) -> EvaluateResponse:
    answer_map = {a.question_id: a.user_answer for a in req.answers}
    details: List[EvaluateDetail] = []
    correct_count = 0
    total = len(req.lesson.questions)

    for q in req.lesson.questions:
        raw_ua = (answer_map.get(q.id) or "").strip()
        ua = _norm(raw_ua)
        correct = False
        ca = _norm(q.correct_answer)
        explanation = q.explanation

        if q.type == "mcq":
            correct = ua == ca and ca != ""
        elif q.type == "fill":
            # Use LLM to check fill-in-blank for synonym matching
            try:
                ok, feedback = check_free_response(q, raw_ua)
                correct = bool(ok)
                # Keep original explanation for fill-in-blank, just validate answer
                explanation = q.explanation
            except Exception:
                # Fallback to basic string matching if LLM fails
                correct = ca != "" and (ua == ca or ca in ua or ua in ca)
                explanation = q.explanation
        elif q.type == "free":
            try:
                ok, feedback = check_free_response(q, raw_ua)
                correct = bool(ok)
                explanation = feedback or q.explanation
            except Exception:
                # Fallback: do not penalize empty implementation environments
                correct = ua != ""
                explanation = (explanation or "") or "Checked without AI."
        else:
            correct = False

        if correct:
            correct_count += 1

        details.append(EvaluateDetail(
            question_id=q.id,
            correct=correct,
            correct_answer=q.correct_answer,
            explanation=explanation,
        ))

    score = round(correct_count / max(1, total), 2)
    if score < 0.6:
        recommendation = f"Review {req.lesson.category} level {req.lesson.level} and try again."
    else:
        recommendation = f"Great job! Unlock level {req.lesson.level + 1} in {req.lesson.category}."

    return EvaluateResponse(
        score=score,
        correct_count=correct_count,
        total=total,
        details=details,
        recommendation=recommendation,
    )


@router.post("/check_free", response_model=FreeCheckResponse)
def check_free(req: FreeCheckRequest) -> FreeCheckResponse:
    try:
        print(f"[DEBUG] check_free called with question type: {type(req.question)}, question: {req.question}")
        print(f"[DEBUG] user_answer: {req.user_answer}")
        ok, feedback = check_free_response(req.question, req.user_answer)
        return FreeCheckResponse(correct=ok, feedback=feedback)
    except Exception as e:
        import traceback
        error_str = str(e)
        print(f"[ERROR] check_free failed: {error_str}")
        print(traceback.format_exc())
        
        # Check if it's a quota error
        if "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str:
            raise HTTPException(
                status_code=429, 
                detail="API quota exceeded. Please try again later or upgrade your API plan."
            )
        
        raise HTTPException(status_code=500, detail=str(e))


