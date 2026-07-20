# Explainable Password Strength Checker

Дипломна работа, специалност Информатика (бакалавър), ФМИ, ПУ „Паисий Хилендарски“.

Инструмент за оценка на силата на пароли, който вместо само число или общ
етикет дава **приоритизиран, обяснен доклад**: за всеки проблем — категория,
тежест, конкретен фрагмент от паролата и разбираемо обяснение защо е слабост.
Комбинира структурен анализ + pattern detection + Have I Been Pwned breach
lookup в едно съобщение.

## Структура

Monorepo с npm workspaces:

- `packages/core` — чиста TypeScript логика (детектори, scorer, explain, HIBP), без UI зависимости
- `apps/web` — React + Vite, статичен сайт за публично демо
- `apps/desktop` — Electron, зарежда build-натата web версия, работи offline

## Разработка

```bash
npm install

# core тестове
npm run test

# web dev сървър (http://localhost:5173)
npm run dev:web

# desktop (build + стартиране на Electron)
npm run dev:desktop
```

## Build за деплой

```bash
npm run build:web       # apps/web/dist -> статичен деплой (Vercel/Netlify/Pages)
npm run build:desktop   # компилира main/preload + build-ва web-а за Electron
```

## Принцип

`packages/core` приема низ (паролата) и връща структуриран `AnalysisResult`.
`apps/web` и `apps/desktop` само го визуализират — цялата логика е написана
веднъж. Паролата никога не напуска устройството в цялост — само 5-символен
SHA-1 prefix се изпраща към Have I Been Pwned.
