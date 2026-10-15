# Fortress AI — Launch Readiness Checklist & Release Protocol

**TDD Reference**: §42.1, §42.2, §36.1  
**Target Release**: v1.0.0 (Production Candidate)

---

## 1. Security & Data Isolation
- [x] Multi-tenant isolation verified: Tenant A cannot view or mutate Tenant B's websites, revisions, domains, or billing.
- [x] Zero secrets in customer static export packages: database URIs, API secret keys, and bearer tokens strictly audited and rejected.
- [x] PII and secrets redacted in operational logs and telemetry.
- [x] Passwords salted and hashed with scrypt.
- [x] Rate limiting active on authentication (5/min per IP) and AI generation endpoints.
- [x] Edge security headers configured (CSP, HSTS, X-Frame-Options: SAMEORIGIN, nosniff).

## 2. AI Architecture & Prompt Governance
- [x] Prompt contracts immutable and pinned by version (`v1.0.0`).
- [x] Two-phase generation engine: SitePlanSchema (structural blueprint) -> PageCopySchema (copy & asset binding).
- [x] Invariant verified across all 6 archetypes: zero fabricated testimonials or proof points.
- [x] Automatic retry and token budget caps active.

## 3. Design System & Static Exporter
- [x] All 20 curated manifest section types fully responsive and rendered with semantic HTML5.
- [x] Theme CSS variable system with light/dark contrast ratio compliance ($\ge 4.5:1$).
- [x] Responsive SVG fallbacks generated for self-contained static archives.
- [x] Compatibility scanner emits `manifest.json` and human-readable `DEPENDENCY_REPORT.md`.
- [x] Multi-host deployment guides generated (Netlify, Vercel, Cloudflare, GitHub Pages, Apache, Nginx).

## 4. Managed Publishing & Custom Domains
- [x] Atomic publish pointer repoint; broken publish never replaces healthy release.
- [x] Immediate one-click rollback tested and validated.
- [x] Custom domain verification via DNS challenge and TLS certificate simulation.
- [x] Zero dark patterns: EPP transfer authorization codes immediately accessible on request.

## 5. Billing, Subscriptions & Notifications
- [x] Subscriptions, invoices, and AI credit debits recorded in immutable integer minor units.
- [x] Webhook processor strictly idempotent (duplicate webhooks ignored without double-fulfillment).
- [x] Brevo transactional email templates for account verification, domain renewal alerts, and invoices.
- [x] Unbundled newsletter consent; one-click unsubscribe flow; suppression list bypass for critical transactional notices.

## 6. Operations & Disaster Recovery
- [x] Automated backup snapshot service with SHA-256 integrity verification.
- [x] Disaster recovery restore drill passes within RTO $\le$ 8h and RPO $\le$ 24h.
- [x] Operational dashboard minimums accessible via `/api/admin/overview` with RBAC role protection.
- [x] All 5 incident runbooks published and linked.
