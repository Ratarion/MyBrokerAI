snowball-clone/
│
├── docker-compose.yml               # Главный файл для сборки и запуска всей инфраструктуры
├── .env.example                     # Шаблон глобальных переменных окружения
│
├── frontend/                        # --- ФРОНТЕНД (Next.js + React) ---
│   ├── src/
│   │   ├── components/              # Графики, таблицы, кнопки
│   │   ├── pages/ (или app/)        # Страницы: дашборд, авторизация, портфель
│   │   └── services/                # API-клиенты для связи с .NET бэкендом
│   ├── Dockerfile
│   └── package.json
│
├── backend-core/                    # --- ОСНОВНОЙ БЭКЕНД (.NET 8 Web API) ---
│   ├── src/
│   │   ├── WebApi/                  # Контроллеры, Middlewares, Настройка DI
│   │   ├── Domain/                  # Сущности (Portfolio, Transaction, Asset, User)
│   │   ├── Infrastructure/          # EF Core, Миграции, Реализация работы с DB и RabbitMQ
│   │   └── Application/             # Бизнес-логика, обработка импорта CSV, расчеты P&L
│   ├── invest-tracker-core.sln
│   └── Dockerfile
│
└── backend-ai/                      # --- АНАЛИТИКА И ИИ (Python) ---
    ├── app/
    │   ├── main.py                  # Точка входа FastAPI (для ручного вызова/тестов)
    │   ├── tasks.py                 # Описание задач Celery (прогноз, балансировка)
    │   ├── models/                  # Математические модели (Prophet, PyPortfolioOpt)
    │   └── services/                # Логика интеграции с OpenAI/Anthropic SDK
    ├── celery_app.py                # Конфигурация Celery воркера
    ├── Dockerfile
    └── requirements.txt             # Зависимости (fastapi, celery, prophet, scipy, и др.)
