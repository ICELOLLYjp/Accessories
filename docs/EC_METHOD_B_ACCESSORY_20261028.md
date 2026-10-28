# Accessories quantity entry → shared Method B manual API (isolated)

Implemented on a **new Draft only**, not deployed. The endpoint remains `null`; currently deployed Accessories and its live data remain untouched.

When an endpoint is configured or canonical `accessoryStock/shared.inventoryReservationAuthority===1`, manual piercing/earring inputs and +/- controls use the Sales-Manager #127 authenticated `/v1/inventory/manual-edit` contract (exact designId, quantityField, observed quantity/revision). No direct Firestore fallback is allowed in this new path. The whole-document `saveDesigns` and pending `flushDesigns` legacy writer are blocked in migration mode, including production, metadata and task edits; these are **not yet migrated**. Unmarked/unconfigured A1 behavior remains unchanged.

The client persists complete intent in per-user localStorage before sending. Unknown outcome looks up the **same** operation ID; explicit retry reuses the exact payload. Known inventory/floor conflicts require fresh server read and operator confirmation. Other errors retain pending for reconciliation; malformed receipts never show success. Recovering a previous operation does not approve a newly entered quantity. Server read follows decisive outcomes.

Validation: Node v22.16.0 client unit tests **8 PASS / 0 FAIL / 0 SKIP**; standalone client syntax check passed. HTML patch was checked for exact existing source anchors and blocked routes but **not run in a browser**. Accessories HTTP/Firestore/Auth Emulator integration **not run**; T-shirts-Stock's earlier tests are references only. Existing PR #22 behavior is preserved as the base.

Remaining: old direct writers and old browser/SW/offline instances, production completion and materials, POS/void/session, checkpoint creation, real identities/Rules/IAM, backup and independent restore, Woo/HPOS/Stripe and approval gates. No Staging/production deployment until all writers close and authorized acceptance. Preserve current live event inventory during 2026-10-30–11-01; historical 180-shirt count must never seed inventory. EC purchasing remains stopped until reconciled event sales/voids/physical inventory and manual reopening.
