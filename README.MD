MyBrokerAI/
│
├── docker-compose.yml          # Главный файл для сборки и запуска всей инфраструктуры
├── .env.example                     # Шаблон глобальных переменных окружения
│
├── frontend/                        # --- ФРОНТЕНД (Next.js + React) ---
│   ├── src/
│   │   ├── components/              # Графики, таблицы, кнопки
│   │   ├── pages/ (или app/)        # Страницы: дашборд, авторизация, портфель
│   │   └── services/                	# API-клиенты для связи с .NET бэкендом
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




Подругому:

snowball-ru/
│
├── docker-compose.yml              # Оркестрация всех сервисов
├── docker-compose.override.yml     # Локальные переопределения (dev)
├── .env.example                    # Шаблон переменных окружения
├── .gitignore
├── .dockerignore
├── README.md
├── Makefile                        # Шорткаты: make up / make migrate / make seed
│
├── infra/                          # 🔧 Инфраструктура и деплой
│   ├── nginx/
│   │   ├── nginx.conf              # Reverse proxy + rate limiting + gzip
│   │   └── conf.d/
│   │       └── default.conf        # Маршруты: /api → core, /ai → ai, / → web
│   ├── postgres/
│   │   └── init/                   # SQL, выполняемый при первом старте контейнера
│   │       └── 01-init.sql         # DDL (пункт 5)
│   └── certbot/                    # (опц.) TLS для прод
│
├── backend-core/                   # 🟦 .NET 8 — основной бэкенд (Clean Architecture)
│   ├── Snowball.sln
│   ├── Dockerfile
│   ├── Directory.Build.props       # Общие настройки сборки (nullable, warnings-as-errors)
│   ├── src/
│   │   ├── Snowball.Domain/        # ❶ Ядро: Entities, ValueObjects, Enums, доменные события
│   │   │   ├── Common/             # BaseEntity, AuditableEntity, ISoftDelete
│   │   │   ├── Entities/           # User, Portfolio, Asset, Transaction, Position, Snapshot...
│   │   │   ├── ValueObjects/       # Money, Ticker, Percentage
│   │   │   ├── Enums/              # AssetType, TransactionType, Currency, BrokerType
│   │   │   └── Exceptions/         # DomainException
│   │   │
│   │   ├── Snowball.Application/    # ❷ Логика приложения (use-cases)
│   │   │   ├── Common/
│   │   │   │   ├── Interfaces/      # IAppDbContext, IQuoteProvider, IBrokerParser, ICurrentUser
│   │   │   │   ├── Behaviours/      # MediatR pipeline: Validation, Logging, Performance
│   │   │   │   └── Mappings/        # AutoMapper / Mapster профили
│   │   │   ├── Portfolios/          # Vertical slice: Commands + Queries + DTO + Validators
│   │   │   │   ├── Commands/
│   │   │   │   └── Queries/
│   │   │   ├── Transactions/
│   │   │   ├── Analytics/           # P&L, XIRR, Average Cost, распределение
│   │   │   ├── Import/              # Импорт брокерских отчётов
│   │   │   └── Subscriptions/
│   │   │
│   │   ├── Snowball.Infrastructure/ # ❸ Внешний мир: БД, парсеры, API, фон. задачи
│   │   │   ├── Persistence/
│   │   │   │   ├── AppDbContext.cs
│   │   │   │   ├── Configurations/  # IEntityTypeConfiguration `<T>`
│   │   │   │   ├── Migrations/      # EF Core migrations
│   │   │   │   └── Interceptors/    # Audit + SoftDelete interceptor
│   │   │   ├── Repositories/
│   │   │   ├── Parsers/             # ❗️ Стратегия парсеров брокеров
│   │   │   │   ├── BrokerParserFactory.cs
│   │   │   │   ├── Sber/SberHtmlParser.cs
│   │   │   │   ├── Tinkoff/TinkoffCsvParser.cs
│   │   │   │   └── Vtb/...          # задел на будущее
│   │   │   ├── Quotes/              # MoexClient, EodhdClient, YahooClient + агрегатор
│   │   │   ├── Jobs/                # Hangfire: UpdateQuotesJob, DailySnapshotJob, DividendSyncJob
│   │   │   ├── Payments/            # YooKassaClient / StripeClient
│   │   │   ├── Ai/                  # HTTP-клиент к backend-ai (FastAPI)
│   │   │   └── Identity/            # JWT, password hashing
│   │   │
│   │   └── Snowball.WebApi/         # ❹ Точка входа (HTTP)
│   │       ├── Program.cs           # DI, middleware, auth, Hangfire dashboard, Swagger
│   │       ├── Controllers/         # Auth, Portfolios, Transactions, Import, Analytics, Ai
│   │       ├── Middleware/          # ExceptionHandling, RateLimiting
│   │       ├── appsettings.json
│   │       └── appsettings.Development.json
│   │
│   └── tests/
│       ├── Snowball.UnitTests/      # Domain + Application (XIRR, парсеры)
│       └── Snowball.IntegrationTests/ # API + БД (Testcontainers)
│
├── backend-ai/                     # 🐍 Python FastAPI — AI робоэдвайзер
│   ├── Dockerfile
│   ├── pyproject.toml / requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI app
│   │   ├── core/                   # config, settings, security
│   │   ├── api/                    # роуты: /optimize, /forecast, /advice
│   │   ├── schemas/                # Pydantic-модели запросов/ответов
│   │   ├── services/
│   │   │   ├── optimizer.py        # PyPortfolioOpt (Марковиц)
│   │   │   ├── forecaster.py       # Prophet
│   │   │   └── advisor.py          # OpenAI/Anthropic текстовые рекомендации
│   │   ├── tasks/                  # Celery-задачи
│   │   │   ├── celery_app.py
│   │   │   ├── optimize_task.py
│   │   │   └── forecast_task.py
│   │   └── clients/                # доступ к котировкам / core API
│   └── tests/
│
├── frontend/                       # 🟩 Next.js 15 (App Router) + TS
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── components.json             # shadcn/ui
│   ├── src/
│   │   ├── app/                    # App Router
│   │   │   ├── (auth)/login, register
│   │   │   ├── (dashboard)/dashboard, portfolio/[id], import, ai-advisor, settings
│   │   │   ├── layout.tsx
│   │   │   └── api/                # Route handlers (proxy/BFF при необходимости)
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn primitives
│   │   │   ├── charts/             # Recharts: Allocation pie, Equity curve
│   │   │   └── features/           # PortfolioTable, DividendCalendar, ImportWizard
│   │   ├── lib/                    # api-client (axios), query-client, utils
│   │   ├── hooks/                  # usePortfolios, usePositions (React Query)
│   │   ├── stores/                 # zustand (auth/ui state)
│   │   └── types/                  # общие TS-типы (зеркало DTO)
│   └── public/
│
├── packages/                       # (опц.) общие артефакты монорепо
│   └── api-contracts/              # OpenAPI-схема → генерация TS-типов
│
└── docs/                           # Документация
    ├── architecture.md
    ├── adr/                        # Architecture Decision Records
    └── api/                        # экспортированный Swagger/OpenAPI
