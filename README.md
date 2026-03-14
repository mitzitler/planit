# Planit

An event planning app built to help users organize, budget, and communicate around events — from casual hangouts to larger gatherings.

## Tech Stack

### Frontend
- **Angular 21** — component framework (standalone components, no NgModule)
- **TypeScript 5.9** — strict mode enabled
- **RxJS 7.8** — reactive state and async handling
- **CSS3** — custom design system with CSS variables, no UI library

### Backend
- **Supabase** — authentication and database (PostgreSQL)

### Testing
- **Vitest** — unit test runner
- **JSDOM** — DOM simulation for tests

### Code Quality
- **Prettier** — code formatting with Angular HTML support

### Design
- **Figma** — UI/UX design and flow mockups

### AI Assistance
- **Claude (Anthropic)** — used throughout development for code generation, architecture decisions, and iterative UI building via [Claude Code](https://claude.ai/code)

## Development

Start the local dev server:

```bash
ng serve
```

Open `http://localhost:4200/`. The app reloads automatically on file changes.

## Building

```bash
ng build
```

Build artifacts go to `dist/`.

## Testing

```bash
ng test
```

## Project Structure

```
src/
  app/
    pages/        # Home, Signup, Event Flow (1–3), Dashboard
    components/   # Nav, Stepper, Star Field
    core/         # Services, guards, Supabase client
```
