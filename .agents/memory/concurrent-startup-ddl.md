---
name: Concurrent startup DDL
description: PostgreSQL IF NOT EXISTS does not make simultaneous table creation safe
---

Do not create the same runtime table from parallel startup jobs, even with `CREATE TABLE IF NOT EXISTS`.

**Why:** Parallel startup creation encountered PostgreSQL's `pg_type_typname_nsp_index` unique constraint: both jobs observed the table as absent and attempted to create its catalog type. The failure prevented catalog synchronization on that startup.

**How to apply:** Give each table one startup creator, or serialize initialization before dependent jobs. Keep any request arriving before initialization fail-closed rather than treating a missing table as successful persistence.