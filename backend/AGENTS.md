# Backend Engineering & Agent Guidelines

Guidelines for working in `backend/` (NestJS 11 + Prisma 7).

---

## 1. Branching Rule Reminder
If you are on `product`, switch to a new branch before modifying backend files:
```bash
git checkout -b <type>/<description>
```

---

## 2. Core Stack & Architecture
- **Framework**: NestJS 11 with TypeScript and Express.
- **ORM / Database**: Prisma 7 with PostgreSQL (`@prisma/adapter-pg`).
- **Cache & Sessions**: Redis (`ioredis`, `connect-redis`).
- **Auth**: JWT (`@nestjs/jwt`), `AuthGuard`, `JwtAdminGuard`.

---

## 3. Engineering Rules

### Security & Guards
- All mutation endpoints (`POST`, `PATCH`, `DELETE`) on administrative or taxonomy resources (tags, categories, topics, contents, content-stats) **must** be protected with `@UseGuards(JwtAdminGuard)`.
- User endpoints must use `@UseGuards(AuthGuard)` and validate ownership.
- Never rely solely on client-supplied tokens or unverified query parameters (e.g. `checkout=success`).

### DTOs & Validation
- Use `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true }`.
- Never allow privileged fields (e.g., `role`, `isSuspended`, `hasCompletedPlacement`) to pass through un-sanitized user profile update DTOs.

### Prisma Schema & Database
- Schema file: `prisma/schema.prisma`.
- Generate client after changes: `npx prisma generate`.
- Do not commit manual raw SQL without corresponding Prisma migrations or schemas.

---

## 4. Verification Commands
```bash
cd backend
npm run type-check   # Type check with tsc --noEmit
npm test             # Run Jest unit tests
npm run test:ci      # Fast CI test suite
npm run build        # Verify NestJS build and postbuild steps
```
