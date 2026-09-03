# MyBrokerAI — правила для агентов

Трекер инвестиционного портфеля с AI-советником. Три подпроекта: `backend-core` (.NET),
`frontend` (Next.js), `backend-ai` (FastAPI, GigaChat — пока не подключён к остальному).

## Архитектура backend-core (Clean Architecture, строго соблюдать слои)

```
InvestTracker.Domain          — сущности, value objects, инварианты. Без зависимостей.
InvestTracker.Application     — CQRS (MediatR): Commands/Queries + Validators (FluentValidation) + DTO.
InvestTracker.Infrastructure  — EF Core (Postgres), внешние API (MOEX ISS), парсеры отчётов, JWT.
InvestTracker.WebApi          — Minimal API эндпоинты, DI wiring в Program.cs.
```

Зависимости идут только вниз: `WebApi → Application/Infrastructure → Domain`. `Domain` ничего не знает
про остальных. Новый use-case — всегда по паттерну `Feature/Commands|Queries/ИмяДействия/`
(Command/Query + Validator + Handler в отдельных файлах).

### Ключевые паттерны, уже принятые в проекте — не изобретать заново

- **Сущности** — приватные сеттеры, создание только через статический `Create(...)`, инварианты
  проверяются внутри и кидают `Domain.Exceptions.DomainException`. Пример: `Portfolio.AddTransaction(...)`,
  а не `new Transaction(...)` напрямую — агрегат сам создаёт дочерние сущности.
- **Value Objects** (`Money`, `Ticker`) — `readonly record struct`. `Money` маппится в EF Core как
  **complex property** (`builder.ComplexProperty(...)`), `Ticker` — через `HasConversion` в строку.
- **Приватные коллекции** (`Portfolio.Transactions`, `User.Portfolios`) — EF-навигация требует
  `builder.Navigation(x => x.Y).UsePropertyAccessMode(PropertyAccessMode.Field)` (не `Uses...`, а `Use...` —
  на этом уже спотыкались).
- **Авторизация в эндпоинтах** — группа с `.RequireAuthorization()`, внутри хендлера
  `httpContext.GetRequiredUserId()` + явная проверка владения (`AnyAsync(p.Id == id && p.UserId == userId)`)
  перед тем, как что-то отдавать/менять. Без исключений — чужие данные не должны утекать по id.
- **Исключения → HTTP** — не кидать всё подряд в 500. `NotFoundException` → 404, `ValidationException`
  (из FluentValidation-пайплайна) → 400, `ConflictException` → 409, `Domain.Exceptions.DomainException` →
  400. Смотри `WebApi/Common/GlobalExceptionHandler.cs`.
- **Enum'ы наружу — строками**, не числами (`JsonStringEnumConverter` уже настроен в `Program.cs`).

## Frontend (Next.js App Router, TypeScript, Tailwind v4)

- Все страницы — клиентские компоненты (`"use client"`), без серверных компонентов/server actions —
  так исторически сложилось, продолжать в том же стиле, если не просят иначе.
- `lib/api.ts` — общие типы (зеркалят DTO бэкенда) и константы. `lib/auth.ts` — чистые функции
  хранения токенов (localStorage). `lib/AuthContext.tsx` — React-контекст + `useAuthFetch()`
  (сам подставляет `Authorization: Bearer`, при 401 пробует `refresh` один раз).
- **`useAuthFetch` не должен ставить `Content-Type: application/json`, если `body instanceof FormData`** —
  на этом уже ловили баг при загрузке файлов.
- Дизайн: тёмная «бухгалтерская» тема — токены в `app/globals.css` (`--background`, `--surface`,
  `--accent` и т.д.), заголовки шрифтом Playfair Display (переменная `--font-display`, **не Fraunces** —
  у него нет кириллицы, уже наступали), остальное — IBM Plex Sans/Mono.
- Защищённые страницы (`/portfolios`, `/portfolios/[id]`) — паттерн: `useAuth()` даёт `{ tokens, isReady }`,
  редирект на `/login`, если `isReady && !tokens`; ничего не рендерить, пока `!isReady`.

## Инструменты и окружение

- **.NET 10 SDK.** `dotnet new sln` создаёт `.slnx` (новый XML-формат) по умолчанию — это нормально,
  не баг. Собирать: `dotnet build backend-core/InvestTracker.slnx`.
- **EF Core миграции** — обязательно оба флага:
  `dotnet ef migrations add ИмяМиграции --project backend-core/InvestTracker.Infrastructure --startup-project backend-core/InvestTracker.WebApi`,
  аналогично для `database update`.
- **Postgres — через `docker compose up -d`** (сервис `investtracker-postgres`), конфиг в
  `docker-compose.yml` + `.env` (создаётся из `.env.example`, в git не идёт).
- **NuGet-пакеты** — при добавлении нового пакета проверять актуальную версию (через доступные
  инструменты/веб), не полагаться на версии из памяти — они могут быть устаревшими или не существовать.
- Секрет `Jwt:Key` в `appsettings.json` — намеренный placeholder для dev. `Program.cs` падает при
  старте, если это значение попадёт в не-Development окружение — так и должно быть, не «чинить»
  подстановкой чего попало.

## Git — обязательно

- **После любых изменений — коммитить И пушить.** Незакоммиченные или закоммиченные-но-незапушенные
  изменения в этом проекте уже не раз терялись/расходились между сессиями — не оставлять работу
  «применённой локально», доводить до `git push` в конце каждой значимой задачи.
- **Никогда не коммитить**: реальные брокерские отчёты/выписки (`doc/report/` в `.gitignore`),
  секреты, `.env`, файлы `*.patch`, артефакты сборки (`bin/`, `obj/`, `node_modules/`, `.next/`).
- Перед коммитом — если сомневаешься, попадает ли файл в `.gitignore`, проверь `git status`, не
  добавляй через `git add -A` не глядя, если менялись конфиги/данные.

## Известные компромиссы модели данных (не баги, осознанные решения)

- У `Transaction` нет отдельного поля «сумма» для чисто денежных операций (Deposit/Withdrawal/
  Dividend/Coupon/Tax) — используется `Quantity=1, Price=сумма`. Учитывать это в любых расчётах/
  агрегациях по транзакциям.
- Тип актива при импорте определяется эвристикой (12-символьный ISIN-подобный код → облигация,
  иначе → акция) — ETF/фонды не отличить. Если строишь редактирование актива — это первое, что
  стоит туда добавить.
- `Transaction.ExternalId` — дедупликация при импорте отчётов (уникален в пределах портфеля, когда
  задан; `null` для транзакций, созданных вручную).
