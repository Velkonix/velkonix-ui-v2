# Velkonix UI — Full Project Documentation (LLM Execution Spec)

## 1. Назначение документа

Данный документ является:
- единственным источником требований (Single Source of Truth)
- контрактом между заказчиком и LLM-ботом
- руководством по генерации кода, тестов и документации

LLM-бот ОБЯЗАН:
- строго следовать этому документу
- не менять контракты без явного указания
- реализовать проект по этапам, описанным ниже

---

## 2. Общее описание продукта

### 2.1 Контекст
Velkonix — fork AAVE v3 протокола децентрализованных займов.  
UI предназначен **исключительно для self-service пользователей**, без административных ролей и панелей.

### 2.2 Пользователь
- Пользователь подключается через EVM-совместимый кошелёк
- Использует протокол для:
  - supply / withdraw
  - borrow / repay
  - staking / rewards / exit

---

## 3. Платформы и окружение

### Web
- Google Chrome (актуальные версии)

### Mobile
- Только responsive web
- Поддержка mobile viewport
- ❌ Нет отдельного мобильного приложения

---

## 4. Scope (Объём работ)

### 4.1 Входит

#### Wallet
- Web3 login через RainbowKit
- Mock wallet в mock mode

#### Pages
- Home
- Markets
- User Dashboard
- Asset Page
- Staking

#### Markets
- Таблица ассетов
- Колонки:
  - Asset
  - Total Supplied
  - Supply APY (кликабельно → modal)
  - Total Borrowed
  - Borrow APY (кликабельно → modal)
- Сортировка по заголовкам
- Клик по строке → Asset page

#### Dashboard
- Summary:
  - Net Worth
  - Average APY
  - Claim button
- Your Supplies:
  - Asset
  - Balance
  - APY
  - Collateral switch
  - Withdraw
- Your Borrows:
  - Asset
  - Debt
  - APY
  - Repay

#### Asset Page
- Back button
- Header: icon, symbol, name
- Supply block:
  - Input
  - Approve / Deposit
- Borrow block:
  - Input
  - Borrow
- Supply info table
- Borrow info table

#### Staking
- Tabs:
  - Convert
  - Stake
  - Rewards
  - Exit
- Convert:
  - Token → xToken
- Stake:
  - Stake / Unstake
- Rewards:
  - Staked amount
  - Unclaimed rewards
  - APR
  - Claim
- Exit:
  - Instant exit
  - Vesting exit
  - Exit queue

#### Layout
- Header:
  - Logo
  - Navigation
  - Wallet menu (short address)
- Footer:
  - X (Twitter)
  - Discord
  - GitHub
  - GitBook
  - Project name

---

## 4.2 НЕ входит
- Продвинутая аналитика
- Web2 login
- Dark / Light theme switch
- Мультиязычность

---

## 5. Design Requirements

### Принципы
- Консистентность
- Простота
- Современный DeFi стиль
- Минимум визуального шума

---

## 6. UI Kit

### 6.1 Общие правила
- Компоненты изолированы и переиспользуемы
- Предсказуемый API
- Поддержка состояний:
  `default / hover / active / disabled / loading`
- Минимальная кастомизация через props

### 6.2 Категории компонентов
- Foundation
- Inputs & Controls
- Feedback & States
- Data Display
- Modals & Overlays
- Web3-specific
- Layout & Navigation
- Domain Components
- Utilities

(Полный список компонентов считается зафиксированным из ТЗ и не дублируется здесь)

---

## 7. Tech Stack (КОНТРАКТ)

- React + TypeScript
- Vite
- UI kit с нуля
- Jest — unit/component tests
- Playwright — visual + e2e

❌ Запрещено:
- UI библиотеки (MUI, Chakra, Ant, Tailwind и т.п.)

---

## 8. Архитектура проекта (КОНТРАКТ)

src/
├─ app/
├─ pages/
├─ features/
├─ shared/
│   ├─ ui/
│   └─ lib/
├─ mock/
├─ styles/
└─ tests/

---

## 9. Data Contracts (НЕ МЕНЯТЬ)

```ts
Asset {
  id: string
  symbol: string
  name: string
  icon: string
  totalSupplied: number
  totalBorrowed: number
  supplyApy: number
  borrowApy: number
}

UserSupply {
  assetId: string
  balance: number
  apy: number
  isCollateral: boolean
}

UserBorrow {
  assetId: string
  debt: number
  apy: number
}

StakingState {
  staked: number
  rewards: number
  apr: number
  exitQueue: {
    startDate: number
    amount: number
    canExit: boolean
  }[]
}

Tx {
  id: string
  status: 'pending' | 'success' | 'failed'
}


⸻

10. Mock Protocol Engine (CRITICAL)

Требования
	•	Включается через VITE_MOCK_MODE=true
	•	Все страницы и действия работают в mock mode
	•	Локальная DB (localStorage / IndexedDB)

Операции
	•	approve
	•	deposit / withdraw
	•	borrow / repay
	•	stake / unstake
	•	claim rewards
	•	instant exit
	•	vesting exit + queue

Поведение
	•	tx delay (pending)
	•	deterministic success / failure
	•	перерасчёт:
	•	net worth
	•	APY
	•	totals
	•	rewards accrual

⸻

11. Wallet

Real mode
	•	RainbowKit
	•	connect / disconnect

Mock mode
	•	случайный mock address сохраненный локально
	•	без браузерных расширений

⸻

12. Этапы реализации (LLM-oriented)
	1.	Bootstrap проекта
	2.	UI Kit
	3.	Mock Protocol Engine
	4.	Wallet (real + mock)
	5.	Feature Slice A (Markets → Asset → Supply)
	6.	Feature Slice B (Borrow → Dashboard)
	7.	Feature Slice C (Staking)
	8.	Responsive / UX polish
	9.	Tests & stabilization
	10.	Documentation & release

⸻

13. Definition of Done (ГЛОБАЛЬНЫЙ)

Для любого этапа:
	•	проект собирается
	•	данные приходят только из data provider
	•	нет UI-заглушек
	•	есть тесты
	•	соблюдены контракты

⸻

14. Master Prompt для LLM

LLM должен:
	•	работать как senior frontend engineer
	•	не менять архитектуру и контракты
	•	выполнять один этап за один запрос
	•	соблюдать acceptance criteria
	•	не перескакивать этапы

16. Финальный результат
	•	Полностью рабочий DeFi UI
	•	Поведение идентично реальному протоколу (через mock engine)
	•	Готовность к замене mock → real contracts
	•	Предсказуемая и контролируемая генерация кода LLM-ботом



17. Цветовая схема

## 1. Base Backgrounds (FOUNDATION)

### Color Tokens (RGB)
- `--bg-primary`: rgb(12, 8, 6) — main application background
- `--bg-secondary`: rgb(18, 12, 9) — cards, panels, blocks
- `--bg-tertiary`: rgb(26, 18, 13) — hover / raised surfaces
- `--bg-overlay`: rgb(8, 5, 4) — modal overlay / backdrop

### Rules
- Backgrounds MUST be **almost black**, NEVER pure black
- Inner blocks MUST be slightly lighter than the parent background
- Difference between layers MUST be **4–8 RGB units only**
- Goal: **soft depth**, not contrast

---

## 2. Brand / Accent (Amber / Gold)

### Color Tokens (RGB)
- `--accent-primary`: rgb(255, 170, 60)
- `--accent-hover`: rgb(255, 190, 90)
- `--accent-active`: rgb(230, 150, 45)
- `--accent-glow`: rgb(255, 140, 0)

### Rules
- ❌ NEVER use pure `#FFA500`
- ✅ Accent color MUST ALWAYS be paired with:
  - gradient OR
  - glow OR
  - both
- Accent color is used ONLY for:
  - primary actions
  - APY values
  - active states
  - highlights

---

## 3. Text Colors

### Color Tokens (RGB)
- `--text-primary`: rgb(245, 235, 225)
- `--text-secondary`: rgb(190, 170, 155)
- `--text-muted`: rgb(140, 120, 105)
- `--text-disabled`: rgb(90, 75, 65)

### Rules
- ❌ NEVER use pure white (`255,255,255`)
- All text MUST be slightly muted
- Headings are brighter, but still NOT white

---

## 4. Borders & Dividers

### Color Tokens
- `--border-subtle`: rgb(55, 40, 30)
- `--border-accent`: rgb(120, 85, 45)

### Rules
- Borders are:
  - almost always `1px`
  - low opacity
- Prefer **box-shadow** over visible borders
- Sharp borders are NOT allowed

---

## 5. Status Colors (DeFi-safe)

- `--success`: rgb(80, 200, 140)
- `--error`: rgb(235, 95, 80)
- `--warning`: rgb(255, 185, 90)
- `--info`: rgb(110, 160, 220)

Usage is STRICTLY semantic (success / error / warning / info).

---

## 6. Glow & Effects (CRITICAL)

### Glow Tokens
- `--glow-strong`: `0 0 24px rgba(255, 140, 0, 0.45)`
- `--glow-medium`: `0 0 16px rgba(255, 140, 0, 0.30)`
- `--glow-soft`: `0 0 8px rgba(255, 140, 0, 0.18)`

### Rules
- ❗ Without glow the UI is considered **incorrect**
- Glow intensity depends on importance:
  - Primary action → strong / medium
  - Secondary / hover → soft

---

# 🧱 COMPONENT IMPLEMENTATION RULES

## 1. Base / Foundation

### Button

#### Primary

background: linear-gradient(180deg, rgb(255,180,80), rgb(230,140,45));
color: rgb(20,14,10);
box-shadow: var(--glow-medium);
border-radius: 12px;

Hover

box-shadow: var(--glow-strong);
transform: translateY(-1px);

Disabled

background: rgb(60,45,35);
color: var(--text-disabled);
box-shadow: none;

❌ Flat buttons are NOT allowed.

⸻

IconButton
	•	Background: transparent

Hover:

background: rgba(255,170,60,0.08);
box-shadow: var(--glow-soft);


⸻

Link

color: var(--accent-primary);
text-decoration: none;

Hover:

color: var(--accent-hover);
text-shadow: var(--glow-soft);


⸻

Typography

Type	Rules
H1	48–56px, weight 600
H2	32–40px
Body	14–16px
Label	12px, letter-spacing: 0.08em

	•	Text color MUST follow text tokens
	•	❌ No pure white

⸻

Divider

height: 1px;
background: linear-gradient(
  90deg,
  transparent,
  var(--border-accent),
  transparent
);


⸻

2. Inputs & Controls

NumberInput / TextInput

background: var(--bg-secondary);
border: 1px solid var(--border-subtle);
color: var(--text-primary);
border-radius: 10px;

Focus:

border-color: var(--accent-primary);
box-shadow: var(--glow-soft);

Error:

border-color: var(--error);


⸻

Switch
	•	Track: rgb(40,30,22)

Active:

background: linear-gradient(180deg, rgb(255,170,60), rgb(230,140,45));
box-shadow: var(--glow-soft);


⸻

Tabs
	•	Default: muted text

Active:

color: var(--accent-primary);
border-bottom: 2px solid var(--accent-primary);
text-shadow: var(--glow-soft);


⸻

3. Feedback & States

Loader / Spinner
	•	Stroke: rgb(255,170,60)
	•	Glow: soft

⸻

Skeleton

background: linear-gradient(
  90deg,
  rgb(30,22,17),
  rgb(45,32,24),
  rgb(30,22,17)
);


⸻

Tooltip

background: rgb(30,22,17);
color: var(--text-secondary);
border: 1px solid var(--border-subtle);
box-shadow: var(--glow-soft);


⸻

Toast
	•	Background: --bg-secondary
	•	Success → --success
	•	Error → --error

⸻

4. Data Display

Table
	•	Background: transparent

Row hover:

background: rgba(255,170,60,0.05);


⸻

TableHeader

color: var(--text-muted);

Active sort:

color: var(--accent-primary);


⸻

ApyCell

color: var(--accent-primary);
cursor: pointer;
text-shadow: var(--glow-soft);


⸻

5. Modals & Overlays

Overlay

background: rgba(5,3,2,0.85);
backdrop-filter: blur(4px);


⸻

Modal

background: var(--bg-secondary);
border: 1px solid var(--border-accent);
box-shadow: var(--glow-medium);
border-radius: 16px;


⸻

6. Web3 / Protocol-specific

WalletConnectButton
	•	ALWAYS primary button
	•	In header: compact + glow

⸻

TxStatus

Status	Style
Pending	accent-primary + pulse
Success	success
Failed	error


⸻

7. Layout & Navigation

Header

background: rgba(12,8,6,0.75);
backdrop-filter: blur(10px);
border-bottom: 1px solid var(--border-subtle);


⸻

Card

background: var(--bg-secondary);
border-radius: 16px;
box-shadow:
  inset 0 0 0 1px var(--border-subtle),
  0 0 24px rgba(255,140,0,0.08);


⸻

8. Domain Components (STRICT RULE)
	•	Domain components MUST NOT introduce new colors
	•	They ONLY compose:
	•	design tokens
	•	glow
	•	gradients

⸻

9. GLOBAL VISUAL LAWS (NON-NEGOTIABLE)
	•	❌ NEVER use pure white or pure black
	•	✅ ALWAYS add micro-glow
	•	✅ ALWAYS use gradients (even subtle)
	•	❌ NEVER use sharp borders
	•	✅ ALWAYS soft shadows and inset effects
	•	❌ NEVER flat buttons

Enforcement Rules
	•	If component looks flat → ADD glow or gradient
	•	If color looks too bright → REDUCE saturation
	•	ALWAYS use design tokens, NEVER invent colors
