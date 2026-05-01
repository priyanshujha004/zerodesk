# ResolveIQ

AI-powered support workflow SaaS. Plugin for any business.

## Team

| Person | Owns |
|--------|------|
| P1 | Auth + Tenant Shell |
| P2 | Chatbot + AI Report Generation |
| P3 | Approval Workflow + Dashboards |
| P4 | Notifications + Report Detail + Polish |

## Setup

```bash
# 1. Clone
git clone <repo-url>
cd resolveiq

# 2. Install all deps
npm install

# 3. Copy env files and fill in values
cp apps/backend/.env.example apps/backend/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local

# 4. Push DB schema
npm run db:migrate

# 5. Seed dummy users
npm run db:seed

# 6. Run both servers
npm run dev
```

## Ports
- Backend (NestJS): http://localhost:3000
- Frontend (Next.js): http://localhost:3001

## Dummy Users (after seed)
| Email | Password | Role |
|-------|----------|------|
| customer@shopease.com | Test@1234 | CUSTOMER |
| cda@shopease.com | Test@1234 | CDA |
| finance@shopease.com | Test@1234 | DEPT_ADMIN |
| superadmin@shopease.com | Test@1234 | SUPER_ADMIN |

## Branch Rules
- `main` → protected, only merge via PR
- `p1/auth`, `p2/chat`, `p3/workflow`, `p4/notifications` → your branches
- Never push directly to main
- Merge into main only during integration phase (tomorrow 6pm)
