# Velkonix UI Kit - Инструкция для LLM и разработчика

Этот файл можно передавать в контекст LLM при любом следующем вызове, чтобы модель использовала UI Kit единообразно.

## 1) Главные правила (обязательно)

- Источник правил: `PROJECT_SPEC.md` (раздел 17, блок про color system и component rules).
- Нельзя использовать чистый белый/черный.
- Нельзя вводить новые цвета вне токенов.
- Нельзя делать плоские кнопки/элементы без glow/gradient.
- Нельзя делать резкие бордеры; использовать мягкие inset/shadow.
- Любой новый компонент обязан собираться из существующих токенов и паттернов.

## 2) Откуда импортировать компоненты

Всегда импортировать из одного входа:

```ts
import {
  Button,
  Input,
  Card,
  Table,
  Modal,
  Typography
} from "src/shared/ui";
```

Не импортировать напрямую из внутренних подпапок, если нет особой причины.

## 3) Доступные компоненты (текущий контракт)

Экспортируются из `src/shared/ui/index.ts`:

- Foundation: `Divider`, `Icon`, `Link`, `Spacer`, `Typography`
- Inputs: `AmountInput`, `Button`, `Checkbox`, `IconButton`, `Input`, `InputGroup`, `NumberInput`, `Select`, `Switch`
- Feedback: `Badge`, `EmptyState`, `ErrorState`, `Skeleton`, `Spinner`, `Toast`, `Tooltip`
- Data display: `ApyCell`, `AssetCell`, `Card`, `Table`, `ValueCell`
- Modals: `Modal`
- Navigation: `Tabs`
- Layout: `AppLayout`, `BackButton`, `Footer`, `Header`, `NavMenu`, `PageContainer`, `PageHeader`, `Section`
- Web3: `ActionButton`, `ApproveButton`, `ClaimButton`, `TxStatus`, `WalletConnectButton`, `WalletMenu`
- Utilities: `classNames`, `visuallyHidden`

## 4) Когда какой компонент использовать

- **Primary action**: `Button` (variant `primary`) или `ActionButton` / `ApproveButton` / `ClaimButton` для протокольных действий.
- **Secondary action**: `Button` (variant `secondary`), для мягких действий.
- **Icon-only action**: `IconButton`.
- **Текстовые переходы/inline action**: `Link`.
- **Текст и заголовки**: `Typography` (`headline`, `title`, `body`, `label`, `caption`).
- **Формы**: `Input`, `NumberInput`, `AmountInput`, `InputGroup`, `Select`, `Checkbox`, `Switch`.
- **Amount c балансом/максом**: `AmountInput` для ввода суммы актива с `MAX`, строкой доступного баланса и USD-эквивалентом.
- **Состояния загрузки/ошибки**: `Spinner`, `Skeleton`, `Toast`, `ErrorState`, `EmptyState`.
- **Табличные данные**: `Table` + `AssetCell` + `ValueCell` + `ApyCell`.
- **Диалоги**: `Modal` (подтверждение/детали APY).
- **Структура страницы**: `PageContainer`, `PageHeader`, `Section`, `Card`, `Header`, `Footer`.

## 5) Правила стилизации для новых компонентов

Если добавляется новый компонент:

1. Не добавлять новые цветовые значения напрямую в CSS.
2. Использовать только токены из `src/styles/index.css`.
3. Для interactive states:
   - `hover`: мягкий glow/gradient shift
   - `active`: более темный/плотный вариант акцента
   - `disabled`: приглушенный текст и без glow
4. Для контейнеров:
   - `background`: `--bg-secondary` / `--bg-tertiary` через gradient
   - `box-shadow`: inset + soft glow
   - `border`: subtle, low opacity
5. Для акцентных элементов:
   - `--accent-*` + `--glow-*` обязательно

## 6) Паттерны по страницам (рекомендуемый скелет)

```tsx
<AppLayout
  header={<Header ... />}
  footer={<Footer ... />}
>
  <PageContainer>
    <PageHeader title="..." subtitle="..." />
    <Section title="...">
      <Card>...</Card>
    </Section>
  </PageContainer>
</AppLayout>
```

## 7) Data flow и архитектурные ограничения

- UI получает данные через provider/feature слой, не хардкодить бизнес-логику в компонентах UI kit.
- Domain-компоненты не создают новые цвета/стили, а только композируют существующие примитивы.
- Для новых feature-блоков сначала собрать из базовых компонентов UI Kit, потом расширять точечно.

## 8) Мини-чеклист перед завершением задачи

- Использованы только компоненты из `src/shared/ui`.
- Нет новых цветов вне токенов.
- На primary/active элементах есть gradient + glow.
- Нет flat кнопок.
- Нет pure white/pure black.
- Состояния `disabled/loading/error` визуально корректны.
- Компоненты проходят по доступности (labels, aria-атрибуты, focus-visible).

### Для задач по темам (обязательно)

- При добавлении новой темы обновить токены в `src/styles/index.css` через `[data-theme="<name>"]`.
- Добавить тему в `SUPPORTED_THEMES` в `src/main.tsx`.
- Добавить тему в `THEME_OPTIONS` в `src/pages/UiKitPage.tsx`, чтобы тема появилась в dropdown UI Kit.
- Не считать задачу завершенной, если тема не отображается и не переключается в UI Kit.

## 9) Готовый prompt-фрагмент для следующего вызова LLM

Вставляй этот блок в задачу:

```text
Use `UI_KIT_LLM_CONTEXT.md` as a strict implementation contract.
Follow `PROJECT_SPEC.md` section 17 rules exactly.
Reuse components only from `src/shared/ui`.
Do not introduce new colors, flat buttons, or sharp borders.
Always apply gradient + glow patterns for accent and interactive states.
```

