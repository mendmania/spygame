# Virtual Board Zone

A monorepo for online party games built with Next.js, React, and Firebase.

## Structure

```
virtualboardzone/
├── apps/
│   ├── hub/          # Main hub at virtualboardzone.com
│   └── spyfall/      # Spyfall game at spyfall.virtualboardzone.com
├── packages/
│   ├── firebase/     # Firebase client SDK wrapper
│   ├── game-core/    # Shared game utilities
│   ├── shared-types/ # TypeScript type definitions
│   └── ui/           # Shared UI components
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all apps in development
pnpm dev

# Or start individually
pnpm dev:hub      # Hub at http://localhost:3000
pnpm dev:spyfall  # Spyfall at http://localhost:3001
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` in each app that needs Firebase
3. Add your Firebase credentials
4. Run `pnpm install`
5. Run `pnpm dev`

### Apps

| App | Port | Description |
|-----|------|-------------|
| Hub | 3000 | Main landing page and game selector |
| Spyfall | 3001 | Spyfall social deduction game |

### Packages

| Package | Description |
|---------|-------------|
| `@vbz/ui` | Shared React components (Button, Card, etc.) |
| `@vbz/firebase` | Firebase initialization and hooks |
| `@vbz/game-core` | Room ID generation, player identity |
| `@vbz/shared-types` | TypeScript interfaces |

## Build

```bash
# Build all apps
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Deployment (Vercel)

Each app deploys as a separate Vercel project:

- **Hub**: Root directory `apps/hub`, domain `virtualboardzone.com`
- **Spyfall**: Root directory `apps/spyfall`, domain `spyfall.virtualboardzone.com`

## License

MIT
