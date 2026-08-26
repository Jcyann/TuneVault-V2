---
name: Postgres "could not determine data type of parameter" with nullable params
description: Fix for node-postgres queries that fail when a bound parameter is null and only used inside a CASE WHEN with no other type context.
---

# Postgres "could not determine data type of parameter $N"

A parameterized query like `CASE WHEN $4 IS NOT NULL THEN $4 ELSE some_text_col END` throws `error: could not determine data type of parameter $4` whenever the bound value for `$4` is `null` — Postgres can't infer the parameter's type from that expression alone, and node-postgres doesn't send explicit type OIDs by default.

**Why:** node-postgres infers a parameter's type from context; a bare `CASE WHEN $n ...` branch gives it none, so this only surfaces once that code path actually runs with a null value — it can sit latent (e.g. behind an earlier short-circuit or an untested branch) until then.

**How to apply:** Cast the parameter explicitly (`$4::text`) or restructure with `COALESCE($4::text, some_text_col)`. Any time you write or review a parameterized query with a nullable value inside a bare `CASE WHEN $n ...` (no other column/literal in that branch establishing type), add the cast proactively — don't wait for the null case to be exercised in testing.
