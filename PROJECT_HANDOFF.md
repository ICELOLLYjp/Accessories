# ICELOLLY Accessories — Project Handoff

Created: 2026-10-05

## Start here

Before proposing or changing code:

1. Open `ICELOLLYjp/Accessories` and inspect the latest `main`.
2. Read this `PROJECT_HANDOFF.md` before editing.
3. Read the latest `index.html` before changing inventory behavior.
4. If the task affects event sales, SKU sales, event inventory or stock synchronization, also inspect the latest `ICELOLLYjp/Sales-Manager/PROJECT_HANDOFF.md`.
5. Preserve existing accessory IDs, stock semantics and canonical Firestore paths unless the user explicitly approves a schema change.
6. For code changes, use a branch and PR and verify the affected data paths before merge.

---

## 1. Product purpose

This is first and foremost the accessory inventory management app for ICELOLLY.

The primary job is to make current accessory stock easy to review and update. It must not drift into becoming the public ecommerce storefront, a generic sales ledger or a replacement for Sales Manager.

Primary operational concerns:

* Accessory design catalog
* Current piercing and earring quantities
* Accessory categories and design priority used by the current app
* Fast inventory review and correction
* iPhone friendly stock operation

---

## 2. Canonical inventory

Canonical accessory real stock is stored in:

* Firestore document: `accessoryStock/shared`
* Canonical design array: `accessoryStock/shared.designs`

The current app reads and writes that shared document. Sales Manager also treats this path as the accessory stock authority.

Typical design fields currently include:

* `id`
* `name`
* `category`
* `piercing`
* `earring`
* `priority`

Do not create a second permanent accessory stock count in another app.

---

## 3. Role boundary with Sales Manager

Sales Manager is the event sales and event business operations app.

Sales Manager may:

* Read the accessory catalog and current stock
* Register accessory SKU metadata needed for POS
* Apply defined exact SKU sale and void effects to canonical accessory stock
* Use event opening, Restock, checkpoint and closing counts as event operational records

Sales Manager does not replace Accessories as the normal place to review and maintain company wide accessory inventory.

Event inventory is stock physically brought to an event and is not the canonical company stock.

---

## 4. Role boundary with the ICELOLLY website

The website and WooCommerce are the customer facing portfolio and ecommerce layer.

The website owns:

* Product photography
* Customer facing product names and descriptions
* Translation and localization
* Online merchandising and browsing
* Cart, checkout, shipping information and online order state

The website may consume accessory design IDs, names, SKU mappings and available stock, but WooCommerce must not become an independent canonical physical inventory authority.

A future ecommerce integration should read accessory stock from `accessoryStock/shared.designs` through a controlled adapter or API. Paid online order stock effects should be explicit, idempotent and auditable.

---

## 5. Shared integration rules

1. `accessoryStock/shared.designs` remains canonical accessory real stock.
2. Preserve stable accessory design IDs.
3. Prefer read only catalog and stock integration as the first website connection step.
4. Any external stock mutation must be explicit, idempotent and auditable.
5. Do not duplicate customer facing product copy or product images here unless required for operations.
6. Unknown and zero must not be conflated in workflows that distinguish them.
7. Do not infer an exact accessory SKU from an unresolved event sale merely to make inventory agree.
8. Before changing a shared contract, inspect the latest Sales Manager handoff and Website project policy.

---

## 6. Current key files

* `index.html` is the main inventory app.
* `event-count.html` and `event-count-v2.js` support event counting flows used with Sales Manager.
* `README.md` points future development chats to this file.

---

## 7. Product boundary summary

Accessories owns accessory inventory.

Sales Manager owns event sales and event business operations.

The website owns public product presentation and ecommerce.

Do not move another system's primary responsibility into this app without an explicit architecture decision.
