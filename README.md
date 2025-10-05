# Lumora — Light for the mind

MVP privacy-first supportive chatbot for campuses. Anonymous by default, consented outreach only, minimal analytics, 30-day retention.

## Monorepo Structure

```
lumora/
├── apps/
│   └── web/                # Next.js application
├── packages/
│   ├── core/               # Shared types, constants, system prompt
│   ├── db/                 # Database schema and client
│   └── services/           # Business logic services
├── infra/
│   ├── docker/             # Dockerfiles
│   └── scripts/            # Seed, retention, health checks
└── .github/workflows/      # CI/CD
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` in `lumora/apps/web/` with:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
MONGODB_URI=mongodb+srv://...
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=apikey_or_username
MAIL_PASSWORD=secret
COUNSELING_INBOX=caps@example.edu
COUNSELING_CONTACTS_JSON='[{"name":"CSUF CAPS","phone":"+1-xxx-xxx-xxxx","email":"caps@csuf.edu","hours":"Mon–Fri 9–5","locationUrl":"https://..."}]'
```

- Set `AI_PROVIDER` to `openai` or `gemini`. Provide the corresponding API key(s) based on which providers you plan to use.

3. Run development server:
```bash
npm run dev
```

4. Seed resources:
```bash
npm run seed:contacts
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linting

## Packages

- **@lumora/core** - Shared types and constants
- **@lumora/db** - Database models and client
- **@lumora/services** - Business logic services
