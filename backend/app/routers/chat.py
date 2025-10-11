from fastapi import APIRouter, HTTPException

from ..schemas import ChatRequest, ChatResponse
from ..services.llm import finance_chat


router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    try:
        ans = finance_chat(req.message, req.context)
        return ChatResponse(answer=ans)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


