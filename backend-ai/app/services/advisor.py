import json

from app.prompts.investment_advisor import SYSTEM_PROMPT
from app.schemas.advisor import AdvisorRequest, AdvisorResponse
from app.services.gigachat import GigaChatClient, GigaChatError


class InvestmentAdvisor:
    def __init__(self, gigachat: GigaChatClient) -> None:
        self._gigachat = gigachat

    async def analyze(self, request: AdvisorRequest) -> AdvisorResponse:
        portfolio_json = request.portfolio.model_dump_json(indent=2)
        user_prompt = (
            "Вопрос пользователя:\n"
            f"{request.question}\n\n"
            "Данные портфеля:\n"
            f"{portfolio_json}"
        )

        raw = await self._gigachat.chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
        )

        try:
            data = json.loads(raw)
            return AdvisorResponse.model_validate(data)
        except Exception:
            # Не теряем ответ модели, если конкретная модель всё же вернула неидеальный JSON.
            raise GigaChatError(
                "GigaChat returned an invalid advisor JSON response. "
                f"Raw response: {raw[:4000]}"
            )
