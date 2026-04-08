# Migrations

Forward-only schema migrations for the D1 database.

Each migration is a numbered SQL file. The current cumulative state is mirrored in `../schema.sql`.

```
0001_initial_schema.sql
0002_add_research_cache.sql
```

## Apply

```bash
bunx wrangler d1 execute whale-watcher --remote --file=src/db/migrations/000N_name.sql
```

## Convention

- Filenames use a four-digit zero-padded sequence followed by a snake_case description.
- Migrations are forward-only. Do not edit a migration after it has been applied to production. Add a new one instead.
- Update `../schema.sql` after applying a migration so a fresh database can be initialized in one shot.
- Schema-breaking changes need a corresponding update to `../queries.js` and any affected route handler.
