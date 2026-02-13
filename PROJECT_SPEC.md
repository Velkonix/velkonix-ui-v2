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