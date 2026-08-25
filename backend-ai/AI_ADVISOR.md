# MyBrokerAI AI Investor Advisor

Новый AI-контур находится в `backend-ai/app` и предоставляет:

- `GET /advisor/health`
- `POST /advisor/analyze`

Для работы задайте переменные из `.env.example`.

Пример запуска из `backend-ai`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Пример запроса:

```json
{
  "question": "Проанализируй мой портфель и укажи основные риски",
  "portfolio": {
    "portfolio_id": "demo",
    "total_value": 100000,
    "currency": "RUB",
    "cash": 10000,
    "assets": [
      {
        "ticker": "SBER",
        "name": "Сбер",
        "quantity": 100,
        "price": 350,
        "currency": "RUB",
        "weight": 0.35
      }
    ]
  }
}
```
