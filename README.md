# Mini Pokédex (Angular 21)

A single-page Angular application for exploring Pokémon, analyzing battle stats, and constructing custom trainer squads using GraphQL APIs and resilient reactive architecture.

---

## 1. Prerequisites & Quickstart

- **Node.js**: v18.19+ or v20+
- **Package Manager**: npm v10+

### Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local mock GraphQL server** (Port 4000):
   ```bash
   npm run mock
   ```
   *The mock server runs on `http://localhost:4000` and provides persistence and mutation handlers for trainer teams.*

3. **Start the Angular development server** (Port 4200):
   ```bash
   npm start
   ```
   *Navigate your browser to `http://localhost:4200`.*

4. **Execute unit tests**:
   ```bash
   npm test
   ```
   *Runs the test suite using Vitest with `@angular/build`.*

5. **Generate production build**:
   ```bash
   npm run build
   ```

---

## 2. Architecture & Design Principles

### Non-Negotiable UI States & Layout Stability
Every asynchronous view (Pokédex table, Pokémon detail drawer, abilities inspector, team list, and autocomplete picker) handles all four fundamental UI states:
1. **Loading**: Shimmer skeletons with fixed, reserved heights to guarantee **Zero Cumulative Layout Shift (CLS = 0)**.
2. **Empty**: Informative messages guiding user actions when query or filter results are blank.
3. **Error**: User-friendly error banners with actionable **Retry** buttons that re-execute failed operations.
4. **Success**: Interactive data presentations.

### Reactive State Management (Custom RxJS Stores)
- **Zero NgRx / Akita / NgXS / Apollo Client**: Built using custom Angular services powered by RxJS `BehaviorSubject`.
- **`PokemonStore`**: Manages catalog loading in sequential batches of 200 items. If an intermittent batch fails, existing rows remain visible and interactive; clicking **Retry** automatically resumes loading from the failed offset.
- **`TeamStore`**: Implements **ID-based optimistic updates**:
  - Newly created teams receive a temporary client ID (`temp-${counter}`) and are rendered immediately.
  - On server response, the temporary ID is reconciled with the server-assigned ID.
  - On mutation failure, the store rolls back specifically by ID.
  - On team deletion failure, the deleted team is re-inserted at its exact `originalIndex`.
  - Teams pending creation have their delete button disabled to prevent race conditions.

### Angular 21 Modern Component Patterns
- **Standalone Components & Signals**: All components are standalone with `ChangeDetectionStrategy.OnPush`.
- **`input()` & `output()`**: Employs modern signal-based inputs and outputs.
- **Dependency Injection**: Dependencies are injected exclusively using `inject()`.
- **`toSignal()` & Zero Subscription Leaks**: RxJS streams are projected to Angular signals in container components using `toSignal()` or consumed via the template `async` pipe.
- **Performance Deferred Loading (`@defer`)**: ECharts radar chart components are bundled into lazy chunks using `@defer (on viewport)`, keeping the initial bundle lightweight. ECharts providers are registered locally via `provideEchartsCore`.

---

## 3. GraphQL Contracts

- **PokéAPI Queries (Public)**: `https://beta.pokeapi.co/graphql/v1beta`
  - `GetPokemon`: Paginated list of Pokémon with stats, types, and official artwork sprites. Includes exponential backoff retry (3 retries).
  - `GetAbilities`: Short English effect descriptions and hidden ability flags.
- **Mock Server Mutations (Local)**: `http://localhost:4000`
  - `allTeams`: Queries persisted teams.
  - `createTeam(trainer_id: ID!, name: String!, pokemon_ids: [Int]!, created_at: String!)`: Creates a team. Mutations are never retried automatically to prevent duplicate creations.
  - `removeTeam(id: ID!)`: Deletes a team.

---

## 4. Key Unit Test Suites

The test suite contains targeted unit tests covering critical architectural boundaries:
- **`PokemonSelectors & Pagination Reset`** (`src/app/pokedex/state/pokemon.selectors.spec.ts`):
  - Case-insensitive name and ID filtering.
  - Elemental type filtering.
  - Automatic `pagination.pageIndex = 0` reset upon search term, type filter, or sort changes.
  - Derived `'empty'` state generation in `pokemonAsyncState$`.
- **`TeamStore Optimistic Updates & Rollbacks`** (`src/app/teams/state/team.store.spec.ts`):
  - Optimistic creation with temporary IDs and server reconciliation.
  - Rollback by temporary ID upon mutation failure.
  - Rollback of deleted teams to their exact original index upon deletion failure.
  - Deletion lock for teams currently pending creation.
- **`Reactive Forms Unique Team Name Validator`** (`src/app/teams/components/team-builder-form/team-builder-form.component.spec.ts`):
  - Validates unique team names against both persisted teams AND pending optimistic teams.

---

## 5. What Would Be Improved with More Time

1. **Virtual Scrolling**: Implement `@angular/cdk/scrolling` virtual viewport for the Pokédex table to render 1000+ Pokémon with constant DOM node count.
2. **Offline Resilience & IndexedDB**: Add offline persistence using Dexie.js or Cache API to enable full catalog browsing offline.
3. **Drag-and-Drop Team Ordering**: Add `@angular/cdk/drag-drop` to reorder Pokémon within teams and drag table rows directly into team slots.
4. **Type Effectiveness Matrix Directive**: Implement a directive `[appTypeHighlight]` calculating defensive weaknesses and offensive advantages for the selected Pokémon.
