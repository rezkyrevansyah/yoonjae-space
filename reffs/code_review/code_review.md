# Code Review Report Template

> **Scope:** This review covers code quality, architecture, security, correctness, error handling, testing, and maintainability. It does NOT cover runtime performance optimization, caching strategy, or database query tuning — those belong in the Performance Review.

---

## Summary

| Field | Details |
|-------|---------|
| **Project** | `{project_name}` |
| **PR/Change** | `{pr_title}` |
| **Author** | `{author}` |
| **Reviewer** | AI Code Review Agent |
| **Date** | `{review_date}` |
| **Tech Stack** | `{detected_stack}` |
| **Framework Version** | `{version}` |
| **Files Changed** | `{file_count}` files |
| **Change Type** | `{feature / bugfix / refactor / migration}` |

### Overall Verdict

| Overall Score | Verdict |
|---------------|---------|
| **{score}/5.0** | {APPROVE / REQUEST CHANGES / REJECT} |

**Bottom line:** {One sentence summary.}

---

## Scorecard

### Tier 1 — Critical (40% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Security | {1-5}/5 | {assessment} |
| Functionality and Correctness | {1-5}/5 | {assessment} |
| Error Handling and Resilience | {1-5}/5 | {assessment} |

### Tier 2 — Important (35% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Architecture and Design | {1-5}/5 | {assessment} |
| Testing Quality | {1-5}/5 | {assessment} |
| Readability and Maintainability | {1-5}/5 | {assessment} |

### Tier 3 — Improvement (25% weight)

| Dimension | Score | Assessment |
|-----------|-------|------------|
| Code Standards and Style | {1-5}/5 | {assessment} |
| Documentation | {1-5}/5 | {assessment} |
| API Design | {1-5}/5 | {assessment} |
| Logging and Observability | {1-5}/5 | {assessment} |
| Deployment and Configuration | {1-5}/5 | {assessment} |

### Scoring Formula

```
Overall = (Security × 0.15 + Functionality × 0.15 + ErrorHandling × 0.10)
        + (Architecture × 0.10 + Testing × 0.10 + Readability × 0.10)
        + (Standards × 0.05 + Documentation × 0.05 + APIDesign × 0.05 + Logging × 0.05 + Deployment × 0.05)
```

| Score Range | Verdict |
|-------------|---------|
| 4.5 – 5.0 | ✅ APPROVE — exemplary code |
| 3.5 – 4.4 | ✅ APPROVE with suggestions |
| 2.5 – 3.4 | ⚠️ REQUEST CHANGES — address issues before merge |
| 1.5 – 2.4 | ❌ REQUEST CHANGES — significant rework needed |
| 1.0 – 1.4 | 🚫 REJECT — fundamental approach is flawed |

---

## Findings

### 🔴 Critical Issues — Must Fix

{If none: "No critical issues found."}

#### 1. {Issue title}

- **File:** `{filepath}:{line}`
- **Dimension:** {Security / Functionality / Error Handling}
- **Impact:** {What could go wrong}

**Problem:** {Clear description.}

**Current code:**
```
{snippet}
```

**Suggested fix:**
```
{fix}
```

---

### 🟠 Major Issues — Should Fix Before Merge

{If none: "No major issues found."}

#### 1. {Issue title}

- **File:** `{filepath}:{line}`
- **Dimension:** {Architecture / Testing / Readability}
- **Impact:** {Impact description}

**Problem:** {Description.}

**Suggested fix:** {Approach or code.}

---

### 🟡 Minor Issues — Recommended

{If none: "No minor issues found."}

- `{filepath}:{line}` — {Suggestion}

---

### 🔵 Nitpicks — Non-Blocking

{If none: "No nitpicks."}

- **Nit:** `{filepath}:{line}` — {Stylistic suggestion.}

---

## Positive Highlights

- {Something done well}
- {Something done well}
- {Something done well}

---

## Technology-Specific Checks

> Only fill in sections relevant to the detected tech stack. Mark all checks in irrelevant sections as N/A.

### Next.js (App Router)

| Check | Status | Notes |
|-------|--------|-------|
| `"use client"` pushed to leaf components | {OK/WARN/FAIL/N/A} | {notes} |
| Server Actions validate inputs and re-authorize | {OK/WARN/FAIL/N/A} | {notes} |
| `server-only` import on sensitive modules | {OK/WARN/FAIL/N/A} | {notes} |
| No secrets in `NEXT_PUBLIC_` variables | {OK/WARN/FAIL/N/A} | {notes} |
| Dynamic route params validated and sanitized | {OK/WARN/FAIL/N/A} | {notes} |
| `error.tsx` in key route segments | {OK/WARN/FAIL/N/A} | {notes} |
| Middleware logic is correct and secure | {OK/WARN/FAIL/N/A} | {notes} |
| Server Action mutations include cache invalidation | {OK/WARN/FAIL/N/A} | {notes} |
| No full database/API objects passed to Client Components | {OK/WARN/FAIL/N/A} | {notes} |
| `remotePatterns` in next.config.js is specific (no wildcards) | {OK/WARN/FAIL/N/A} | {notes} |

### Laravel

| Check | Status | Notes |
|-------|--------|-------|
| Thin controllers (logic in Services/Actions) | {OK/WARN/FAIL/N/A} | {notes} |
| Form Requests for validation | {OK/WARN/FAIL/N/A} | {notes} |
| `$fillable` / `$guarded` on all models | {OK/WARN/FAIL/N/A} | {notes} |
| Authorization via Policies/Gates | {OK/WARN/FAIL/N/A} | {notes} |
| API Resources for response formatting | {OK/WARN/FAIL/N/A} | {notes} |
| Queue jobs have `$tries` / `$backoff` / `failed()` | {OK/WARN/FAIL/N/A} | {notes} |
| Rate limiting on auth and API routes | {OK/WARN/FAIL/N/A} | {notes} |
| No raw SQL with string interpolation | {OK/WARN/FAIL/N/A} | {notes} |
| Migrations have `down()` and FK constraints | {OK/WARN/FAIL/N/A} | {notes} |
| No `{!! $variable !!}` without sanitization | {OK/WARN/FAIL/N/A} | {notes} |

### Flutter

| Check | Status | Notes |
|-------|--------|-------|
| Clean architecture layers respected | {OK/WARN/FAIL/N/A} | {notes} |
| Domain layer free of Flutter imports | {OK/WARN/FAIL/N/A} | {notes} |
| No business logic in `build()` methods | {OK/WARN/FAIL/N/A} | {notes} |
| BLoC/Cubit single responsibility | {OK/WARN/FAIL/N/A} | {notes} |
| `const` constructors used where possible | {OK/WARN/FAIL/N/A} | {notes} |
| `ListView.builder` for long lists | {OK/WARN/FAIL/N/A} | {notes} |
| Stream/subscription cleanup | {OK/WARN/FAIL/N/A} | {notes} |
| `setState()` not high in widget tree | {OK/WARN/FAIL/N/A} | {notes} |
| No `print` statements in production | {OK/WARN/FAIL/N/A} | {notes} |
| `equatable` used for BLoC states | {OK/WARN/FAIL/N/A} | {notes} |

### Database Schema

| Check | Status | Notes |
|-------|--------|-------|
| Every table has a primary key | {OK/WARN/FAIL/N/A} | {notes} |
| Foreign keys with ON DELETE behavior | {OK/WARN/FAIL/N/A} | {notes} |
| Migrations are backward-compatible | {OK/WARN/FAIL/N/A} | {notes} |
| Parameterized queries (no string interpolation) | {OK/WARN/FAIL/N/A} | {notes} |
| Timestamps timezone-aware (UTC) | {OK/WARN/FAIL/N/A} | {notes} |
| Schema in 3NF (or denormalization documented) | {OK/WARN/FAIL/N/A} | {notes} |

### API Design

| Check | Status | Notes |
|-------|--------|-------|
| RESTful resource naming (plural, no verbs) | {OK/WARN/FAIL/N/A} | {notes} |
| Correct HTTP status codes | {OK/WARN/FAIL/N/A} | {notes} |
| Consistent error response format | {OK/WARN/FAIL/N/A} | {notes} |
| Input validation on all endpoints | {OK/WARN/FAIL/N/A} | {notes} |
| Authentication/authorization enforced | {OK/WARN/FAIL/N/A} | {notes} |
| CORS properly configured | {OK/WARN/FAIL/N/A} | {notes} |

---

## Security Checklist (OWASP Top 10)

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | {OK/WARN/FAIL/N/A} | {notes} |
| A02 | Cryptographic Failures | {OK/WARN/FAIL/N/A} | {notes} |
| A03 | Injection | {OK/WARN/FAIL/N/A} | {notes} |
| A04 | Insecure Design | {OK/WARN/FAIL/N/A} | {notes} |
| A05 | Security Misconfiguration | {OK/WARN/FAIL/N/A} | {notes} |
| A06 | Vulnerable Components | {OK/WARN/FAIL/N/A} | {notes} |
| A07 | Auth Failures | {OK/WARN/FAIL/N/A} | {notes} |
| A08 | Data Integrity Failures | {OK/WARN/FAIL/N/A} | {notes} |
| A09 | Logging and Monitoring Gaps | {OK/WARN/FAIL/N/A} | {notes} |
| A10 | SSRF | {OK/WARN/FAIL/N/A} | {notes} |

---

## Deployment Readiness

| Check | Status | Notes |
|-------|--------|-------|
| Environment variables documented and validated | {OK/WARN/FAIL/N/A} | {notes} |
| No secrets in source code or client bundles | {OK/WARN/FAIL/N/A} | {notes} |
| Build succeeds in production mode | {OK/WARN/FAIL/N/A} | {notes} |
| Database migrations tested and reversible | {OK/WARN/FAIL/N/A} | {notes} |
| Feature flags for risky changes | {OK/WARN/FAIL/N/A} | {notes} |
| Rollback plan identified | {OK/WARN/FAIL/N/A} | {notes} |

---

## Action Items Summary

### Must Fix (Before Merge)

1. {issue title} — `{file}:{line}`

### Should Fix (Recommended)

1. {issue title} — `{file}:{line}`

### Consider (Optional)

1. {suggestion} — `{file}:{line}`

---

## Cross-Reference

> If a Performance Review was also conducted, note any shared findings here to avoid confusion:

| Finding | Code Review Angle | Performance Review Angle |
|---------|-------------------|--------------------------|
| {shared finding} | {code quality perspective} | {performance perspective} |

---

*Generated by AI Code Review Agent. Scoring based on Google Engineering Practices, SonarQube quality models, and framework-specific best practices.*
