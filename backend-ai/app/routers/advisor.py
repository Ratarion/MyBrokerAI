from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from app.schemas.advisor import AdvisorRequest, AdvisorResponse
from app.services.advisor import InvestmentAdvisor
from app.services.gigachat import GigaChatClient, GigaChatError

router = APIRouter(prefix="/advisor", tags=["AI Advisor"])
_advisor = InvestmentAdvisor(GigaChatClient())


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyze", response_model=AdvisorResponse)
async def analyze(
    request: AdvisorRequest,
    x_ai_token: str | None = Header(default=None),
) -> AdvisorResponse:
    if settings.ai_internal_token and x_ai_token != settings.ai_internal_token:
        raise HTTPException(status_code=401, detail="Invalid AI internal token")

    try:
        return await _advisor.analyze(request)
    except GigaChatError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
