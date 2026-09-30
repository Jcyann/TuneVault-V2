---
name: Owner-only catalog edits
description: Why tune copy editing and the existing admin surface require a verified, explicit owner account
---

Keep the owner editing surface fail-closed until a specific verified owner identity has been configured. An authenticated account by itself is not enough, and the admin URL is not access control.

**Why:** The existing admin area was discoverable and its API routes accepted anonymous requests. Adding another write action there without protecting the shared surface would have created a misleading "owner-only" interface while leaving direct requests open.

**How to apply:** For future admin actions, reuse the same owner authorization boundary. Do not automatically promote the first person who signs up. Explicitly configure the owner identity before enabling writes.