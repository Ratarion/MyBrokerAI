# MyBrokerAI AI-инвестсоветник

AI-контур живёт в `backend-ai/app` и не имеет прямого доступа к PostgreSQL.
`backend-core` формирует snapshot только текущего авторизованного пользователя и передаёт его в этот сервис.

## Endpoints

- `GET /advisor/health` — health check.
- `POST /advisor/analyze` — анализ переданного портфеля.

## Контракт snapshot

В запросе можно передать:

- несколько брокерских счетов;
- несколько позиций;
- стоимость и доходность портфеля;
- cash;
- IMOEX и его изменение;
- вопрос пользователя.

Это позволяет одному AI-контурy обслуживать все портфели одного пользователя, не выдавая модели доступ к чужим данным.

## Запуск

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

В `.env`:

```env
GIGACHAT_AUTH_KEY=...
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_BASE_URL=https://api.giga.chat
GIGACHAT_MODEL=GigaChat-3-Ultra
AI_INTERNAL_TOKEN=...
```
