# Applying database migrations

Migrations (`supabase/migrations/*.sql`) are applied from GitHub, with a button.
No terminal needed.

## One-time setup: two secrets

GitHub needs two keys to reach the Qipu Supabase project. They are stored as
**repository secrets**: GitHub keeps them encrypted, and nobody (including Claude)
can read them back.

1. **Supabase access token**
   - supabase.com/dashboard → your avatar (bottom left) → **Account preferences** → **Access Tokens** → **Generate new token**.
   - Name it `qipu-github`. Copy it (it is shown only once).
   - GitHub → `qipu-app` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
     Name: `SUPABASE_ACCESS_TOKEN`. Paste. **Add secret**.
2. **Database password** of the Qipu project
   - If you don't have it: Supabase → Qipu project → **Project Settings** → **Database** → **Reset database password**.
     This is safe: the app does not use this password.
   - GitHub → same place → **New repository secret**. Name: `SUPABASE_DB_PASSWORD`. Paste. **Add secret**.

## Every time there is a new migration

1. GitHub → `qipu-app` → **Actions** → **Apply database migrations** → **Run workflow**.
2. Branch: `develop`. Mode: **Preview (changes nothing)**. Run.
3. Open the run and read "Preview what would be applied". It lists the migrations that would run.
4. If it looks right: **Run workflow** again with **Apply migrations**.
5. When it finishes, the regenerated `src/types/database.ts` is saved to `develop` automatically.

Every run first tests all migrations on a fresh, throwaway database. If that test fails, nothing is sent to Supabase.
