#!/usr/bin/env python3
"""
Apply all LocInsight migrations to Supabase.

Robust SQL splitter handles:
  - Single-quoted strings ('...' with '' escape)
  - Double-quoted identifiers ("...")
  - Dollar-quoted blocks ($tag$ ... $tag$)
  - Line comments (-- ...)
  - Block comments (/* ... */)
"""
import os
import sys
import psycopg2

PROJECT_REF = os.getenv("SUPABASE_PROJECT_REF", "fcyhrzzfvdsghtummizv")
HOST = os.getenv("SUPABASE_DB_HOST", "aws-0-ap-southeast-2.pooler.supabase.com")
PORT = int(os.getenv("SUPABASE_DB_PORT", "6543"))
USER = f"postgres.{PROJECT_REF}"
PASSWORD = os.environ["SUPABASE_DB_PASSWORD"]  # Required, do NOT hardcode
DBNAME = "postgres"

MIGRATIONS_DIR = "/home/z/my-project/deploy/locinsights_db/migrations"


def split_sql(sql_text: str):
    """Split SQL into individual statements, respecting all quoting rules."""
    statements = []
    buf = []
    i = 0
    n = len(sql_text)

    while i < n:
        ch = sql_text[i]

        # Line comment
        if ch == '-' and i + 1 < n and sql_text[i+1] == '-':
            # Skip to end of line
            j = sql_text.find('\n', i)
            if j == -1:
                i = n
            else:
                i = j
            continue

        # Block comment
        if ch == '/' and i + 1 < n and sql_text[i+1] == '*':
            j = sql_text.find('*/', i + 2)
            if j == -1:
                i = n
            else:
                i = j + 2
            continue

        # Single-quoted string
        if ch == "'":
            buf.append(ch)
            i += 1
            while i < n:
                ch2 = sql_text[i]
                buf.append(ch2)
                if ch2 == "'":
                    # Check for '' escape
                    if i + 1 < n and sql_text[i+1] == "'":
                        buf.append("'")
                        i += 2
                        continue
                    else:
                        i += 1
                        break
                i += 1
            continue

        # Double-quoted identifier
        if ch == '"':
            buf.append(ch)
            i += 1
            while i < n:
                ch2 = sql_text[i]
                buf.append(ch2)
                if ch2 == '"':
                    if i + 1 < n and sql_text[i+1] == '"':
                        buf.append('"')
                        i += 2
                        continue
                    else:
                        i += 1
                        break
                i += 1
            continue

        # Dollar-quoted block ($tag$ ... $tag$)
        if ch == '$':
            # Try to read $tag$
            j = i + 1
            tag_chars = []
            while j < n and sql_text[j] != '$' and (sql_text[j].isalnum() or sql_text[j] == '_'):
                tag_chars.append(sql_text[j])
                j += 1
            if j < n and sql_text[j] == '$':
                # Found $tag$ — now find matching $tag$
                tag = '$' + ''.join(tag_chars) + '$'
                end = sql_text.find(tag, j + 1)
                if end != -1:
                    # Append the entire dollar-quoted block to buffer
                    buf.append(sql_text[i:end + len(tag)])
                    i = end + len(tag)
                    continue
            # Not a dollar-quote — fall through

        # Statement terminator
        if ch == ';':
            stmt = ''.join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
            i += 1
            continue

        buf.append(ch)
        i += 1

    final = ''.join(buf).strip()
    if final:
        statements.append(final)
    return statements


def apply_migration(conn, filename: str) -> tuple:
    """Apply a single migration file. Returns (success_count, failed_count, errors)."""
    path = os.path.join(MIGRATIONS_DIR, filename)
    print(f"\n→ Applying {filename}...")
    with open(path, "r") as f:
        sql_content = f.read()

    statements = split_sql(sql_content)
    print(f"  {len(statements)} statements parsed")

    cur = conn.cursor()
    conn.autocommit = True
    success = 0
    failed = 0
    errors = []
    for i, stmt in enumerate(statements, 1):
        first_line = stmt.split('\n')[0][:90]
        try:
            cur.execute(stmt)
            success += 1
        except Exception as e:
            err_msg = str(e).strip().split('\n')[0][:150]
            if 'already exists' in err_msg.lower() or 'duplicate object' in err_msg.lower():
                success += 1
            else:
                failed += 1
                errors.append((i, first_line, err_msg))
    conn.autocommit = False
    cur.close()
    print(f"  Result: {success} ok, {failed} failed")
    for idx, sql_preview, err in errors[:5]:
        print(f"    ✗ Stmt {idx}: {err}")
        print(f"      SQL: {sql_preview}")
    if len(errors) > 5:
        print(f"    ... and {len(errors) - 5} more errors")
    return success, failed, errors


def verify_state(conn):
    cur = conn.cursor()
    conn.autocommit = True
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables created ({len(tables)}):")
    for t in tables:
        print(f"  - {t}")

    cur.execute("""
        SELECT extname, extversion FROM pg_extension
        WHERE extname IN ('postgis','uuid-ossp','pgcrypto','pg_trgm','btree_gist')
        ORDER BY extname;
    """)
    exts = cur.fetchall()
    print(f"\nExtensions: {[f'{e[0]}={e[1]}' for e in exts]}")

    print("\nRow counts:")
    for t in ['countries','provinces','kabupaten','kecamatan','kelurahan','brands','malls','pois','competitor_stores','mall_tenants','staging_stores','ml_models','predictions']:
        try:
            cur.execute(f"SELECT count(*) FROM public.{t};")
            print(f"  {t:20s}: {cur.fetchone()[0]} rows")
        except Exception as e:
            print(f"  {t:20s}: ERROR ({str(e).strip()[:60]})")

    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname='public' AND rowsecurity=true
        ORDER BY tablename;
    """)
    rls = [r[0] for r in cur.fetchall()]
    print(f"\nRLS-enabled tables ({len(rls)})")

    cur.execute("""
        SELECT typname FROM pg_type
        WHERE typcategory='E' AND typtype='e'
        ORDER BY typname;
    """)
    enums = [r[0] for r in cur.fetchall()]
    print(f"\nEnums created ({len(enums)}): {', '.join(enums)}")

    cur.close()
    conn.autocommit = False


def main():
    print(f"Connecting to Supabase ({USER}@{HOST}:{PORT})...")
    conn = psycopg2.connect(
        host=HOST, port=PORT, user=USER, password=PASSWORD,
        dbname=DBNAME, connect_timeout=15
    )
    print("✓ Connected!")

    migrations = sorted([
        f for f in os.listdir(MIGRATIONS_DIR)
        if f.endswith(".sql") and f[0].isdigit()
    ])
    print(f"\nFound {len(migrations)} migration files: {migrations}")

    total_success = 0
    total_failed = 0
    for m in migrations:
        s, f, _ = apply_migration(conn, m)
        total_success += s
        total_failed += f

    verify_state(conn)
    conn.close()
    print(f"\n✓ Done. {total_success} statements applied, {total_failed} failed.")


if __name__ == "__main__":
    main()
