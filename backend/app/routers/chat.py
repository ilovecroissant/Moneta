from fastapi import APIRouter, HTTPException

from ..schemas import ChatRequest, ChatResponse
from ..services.llm import finance_chat, generate_motivational_quote


router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    try:
        ans = finance_chat(req.message, req.context)
        return ChatResponse(answer=ans)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/motivational-quote")
def get_motivational_quote() -> dict:
    """Generate a short motivational quote related to personal finance."""
    try:
        quote = generate_motivational_quote()
        return {"quote": quote}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


