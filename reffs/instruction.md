# AI Agent Review System — Master Instructions

## Purpose

This file instructs the AI agent on how to conduct two complementary reviews on a codebase. These reviews have **distinct scopes** and **must not overlap**:

| Review Type | Scope | Reference File | Output File |
|---|---|---|---|
| **Code Review** | Source code quality, architecture, security, correctness | `reffs/code_review/code_review.md` | `code_review_report_[YYYY-MM-DD].md` |
| **Performance Review** | Runtime performance, database optimization, caching, loading speed | `reffs/performance_review/performance_checklist.md` | `performance_report_[YYYY-MM-DD].md` |

---

## Review Scope Boundaries

The two reviews are designed to be **complementary, not overlapping**. Follow these boundaries strictly to avoid conflicting or duplicate findings:

### Code Review owns:
- Code correctness, logic bugs, edge cases
- Architecture and design patterns (SOLID, separation of concerns)
- Security vulnerabilities (OWASP Top 10, auth, input validation, secrets)
- Error handling and resilience patterns
- Testing quality and coverage
- Code readability, naming, documentation
- API design conventions
- Deployment configuration correctness

### Performance Review owns:
- Caching strategy (Next.js Data Cache, Route Cache, Router Cache, unstable_cache)
- Database query optimization (SELECT columns, pagination, batch operations)
- RLS policy performance (indexes, SELECT wrappers, role specifications)
- Supabase client setup and session management efficiency
- Image and asset optimization (next/image, next/font, bundle size)
- Rendering strategy (SSG vs ISR vs SSR vs Streaming)
- Component boundary optimization (Server vs Client Components for performance)
- Loading UX (Suspense, loading.tsx, skeleton patterns, optimistic UI)
- Prefetching and navigation performance

### Shared concerns (both reviews may flag, but from different angles):
- **N+1 queries**: Code Review flags it as a correctness/architecture issue. Performance Review flags it with specific fix patterns and measured impact.
- **Missing indexes**: Code Review flags missing FK indexes as a schema issue. Performance Review flags indexes needed for query plans and RLS policies.
- **Middleware**: Code Review checks for security logic correctness. Performance Review checks for weight and matcher scope.
- **Server/Client boundaries**: Code Review checks for data exposure and architectural correctness. Performance Review checks for bundle size impact and hydration cost.

When both reviews flag the same file/line, the findings should be **complementary** (different angles), never **contradictory** (different recommendations).

---

## How to Run Reviews

### Option A: Run both reviews together

Trigger prompt:
```
Review this project using the review system in reffs/. Run both code review and performance review. Output separate report files for each.
```

Process:
1. Read `reffs/instruction.md` (this file) to understand the system
2. Read `reffs/code_review/code_review.md` for code review template and rules
3. Read `reffs/performance_review/performance_checklist.md` for performance review template and rules
4. Perform Phase 1: Context Gathering (shared between both reviews)
5. Perform Code Review → output `code_review_report_[YYYY-MM-DD].md`
6. Perform Performance Review → output `performance_report_[YYYY-MM-DD].md`
7. Cross-check: verify no contradictory findings between the two reports

### Option B: Run a single review

Trigger prompts:
```
Review this project's code quality using reffs/code_review/code_review.md
```
```
Review this project's performance using reffs/performance_review/performance_checklist.md
```

### Option C: Review specific files or areas

Trigger prompts:
```
Review the performance of app/dashboard/ using reffs/performance_review/performance_checklist.md
```
```
Review the security of lib/supabase/ using reffs/code_review/code_review.md
```

---

## Shared Phase 1: Context Gathering

Before any review, the agent must gather context. This phase is shared between both reviews to avoid redundant work:

1. **Detect tech stack** by examining:
   - `package.json` → Framework, version, dependencies
   - `next.config.js` / `next.config.mjs` → Next.js configuration
   - `tsconfig.json` → TypeScript configuration
   - `.env.example` or `.env.local` → Environment variable patterns
   - `supabase/` folder → Migration files, seed data, RLS policies

2. **Detect Next.js version** — this is critical because caching defaults changed between v14 and v15+:
   - Read `package.json` → `dependencies.next` or `devDependencies.next`
   - If version starts with `14.x`: fetch defaults to `force-cache`
   - If version starts with `15.x` or higher: fetch defaults to `no-store`
   - Performance Review adapts its caching checks based on this version

3. **Map the project structure**:
   - `app/` directory → Route segments, layouts, pages, loading/error files
   - `lib/` or `utils/` → Shared utilities, Supabase client setup
   - `components/` → UI components, Server vs Client boundary analysis
   - `middleware.ts` → Auth and routing middleware
   - `supabase/migrations/` → Database schema and RLS policies

4. **Identify the change scope** (if reviewing a PR/diff):
   - Read commit messages or PR description
   - List affected files
   - Categorize: feature / bugfix / refactor / migration / performance

---

## Agent Behavior Rules

1. **Be version-aware.** Many recommendations differ between Next.js 14, 15, and beyond. Always check the version first and adapt.

2. **Be stack-aware.** The code review template includes checks for Next.js, Laravel, Flutter, and general API/Database. Only apply sections relevant to the detected stack. Mark irrelevant sections as N/A.

3. **Never contradict between reports.** If Code Review says "move this to a Server Component for security," Performance Review must not say "keep this as a Client Component for UX." Both reviews should arrive at compatible recommendations.

4. **Prioritize safety.** Never recommend changes that could:
   - Break existing functionality
   - Introduce data leaks (especially cached user data)
   - Cause runtime errors in production
   - Remove error handling or validation

5. **Be specific and actionable.** Every finding must include:
   - Exact file path and line number (or function/component name)
   - What is wrong and why it matters
   - A concrete fix (code snippet or step-by-step)

6. **Score honestly.** Don't inflate scores. A codebase with no caching strategy and no loading states deserves a low performance score, even if the code quality is excellent.

7. **Acknowledge what's done well.** Both reports should include a "Positive Highlights" section. Reviews are for improvement, not just criticism.

---

## Output File Naming Convention

Reports should be saved in the project root (or a `reviews/` directory if one exists):

```
code_review_report_2025-03-08.md
performance_report_2025-03-08.md
```

If multiple reviews are run on the same day, append a sequence number:
```
code_review_report_2025-03-08_02.md
performance_report_2025-03-08_02.md
```
