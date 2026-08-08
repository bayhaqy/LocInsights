#!/usr/bin/env python3
"""
Sync local SQLite (db/custom.db) → Supabase Postgres.

Bypasses Prisma entirely and uses raw SQL via psycopg2 to copy all the
LocInsight master data (stores, brands, malls, pois, kabupaten, kecamatan,
kelurahan) from the local SQLite into the production Supabase DB.

The local SQLite was populated by `bun run scripts/seed-db.ts` previously,
and has the complete dataset (80 stores, 27 brands, 20 malls, 42 POIs,
9 kabupaten, 48 kecamatan, 172 kelurahan).

Idempotent: uses INSERT ... ON CONFLICT DO UPDATE (upsert).

Usage:
  python3 /home/z/my-project/scripts/sync_sqlite_to_supabase.py
"""
import sqlite3
import psycopg2
from typing import Any

SQLITE_PATH = "/home/z/my-project/db/custom.db"

PG_CONFIG = {
    "host": "aws-0-ap-southeast-2.pooler.supabase.com",
    "port": 6543,
    "user": "postgres.fcyhrzzfvdsghtummizv",
    "password": "Belajar@11!!",
    "dbname": "postgres",
}


def sqlite_row_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    return {col[0]: row[i] for i, col in enumerate(cursor.description)}


def to_bool(value: Any) -> bool:
    """Convert SQLite-stored boolean (0/1 int) → Python bool."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        return value.lower() in ("true", "1", "t", "yes")
    return bool(value)


def to_pg(value: Any) -> Any:
    """Convert SQLite values to Postgres-compatible Python types (passthrough)."""
    return value


def upsert(pgcur, table: str, rows: list[dict], conflict_col: str, columns: list[str]):
    """Upsert a batch of rows into a Postgres table."""
    if not rows:
        print(f"  {table}: 0 rows (skipped)")
        return
    cols_sql = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    update_cols = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in columns if c != conflict_col)
    sql = f'INSERT INTO {table} ({cols_sql}) VALUES ({placeholders}) ON CONFLICT ("{conflict_col}") DO UPDATE SET {update_cols}'
    batch = [tuple(to_pg(r.get(c)) for c in columns) for r in rows]
    pgcur.executemany(sql, batch)
    print(f"  {table}: {len(rows)} rows upserted")


def main():
    print("Connecting to SQLite...")
    sconn = sqlite3.connect(SQLITE_PATH)
    scur = sconn.cursor()
    scur.row_factory = sqlite_row_factory

    print("Connecting to Supabase Postgres...")
    pconn = psycopg2.connect(**PG_CONFIG, connect_timeout=15)
    pconn.autocommit = False
    pcur = pconn.cursor()

    # Bali province code (Indonesia province 51 = Bali)
    BALI_PROVINCE_CODE = "51"

    try:
        # ============================================================
        # 1. KABUPATEN
        # ============================================================
        print("\n[1/7] Syncing kabupaten...")
        scur.execute("SELECT * FROM Kabupaten")
        rows = scur.fetchall()
        tier_map = {1: "1", 2: "2", 3: "3"}
        cols = ["code", "name", "type", "capital", "province_code", "province", "country", "city",
                "lat", "lng", "area_km2", "population_2024", "population_density",
                "gdrp_per_capita_juta", "tier", "hdmi_2024", "tourist_hotels",
                "notes", "source"]
        pg_rows = []
        for r in rows:
            tier_val = r.get("tier")
            if isinstance(tier_val, int):
                tier_val = tier_map.get(tier_val, "1")
            pg_rows.append({
                "code": r["code"],
                "name": r["name"],
                "type": r["type"],
                "capital": r.get("capital"),
                "province_code": BALI_PROVINCE_CODE,
                "province": r.get("province", "Bali"),
                "country": r.get("country", "Indonesia"),
                "city": r.get("city", ""),
                "lat": r["lat"],
                "lng": r["lng"],
                "area_km2": r.get("area_km2"),
                "population_2024": r.get("population_2024"),
                "population_density": r.get("population_density"),
                "gdrp_per_capita_juta": r.get("gdrp_per_capita_juta"),
                "tier": tier_val,
                "hdmi_2024": r.get("hdmi_2024"),
                "tourist_hotels": r.get("tourist_hotels", 0),
                "notes": r.get("notes", ""),
                "source": r.get("source", "BPS Bali 2024"),
            })
        upsert(pcur, "kabupaten", pg_rows, "code", cols)

        # ============================================================
        # 2. KECAMATAN
        # ============================================================
        print("\n[2/7] Syncing kecamatan...")
        scur.execute("SELECT * FROM Kecamatan")
        rows = scur.fetchall()
        tier_map = {1: "1", 2: "2", 3: "3"}
        cols = ["code", "name", "kabupaten_code", "province", "country", "city",
                "lat", "lng", "population_2024", "area_km2", "tier", "urban_score",
                "is_capital", "source"]
        pg_rows = []
        for r in rows:
            tier_val = r.get("tier")
            if isinstance(tier_val, int):
                tier_val = tier_map.get(tier_val, "1")
            pg_rows.append({
                "code": r["code"],
                "name": r["name"],
                "kabupaten_code": r["kabupaten_code"],
                "province": r.get("province", "Bali"),
                "country": r.get("country", "Indonesia"),
                "city": r.get("city", ""),
                "lat": r["lat"],
                "lng": r["lng"],
                "population_2024": r.get("population_2024"),
                "area_km2": r.get("area_km2"),
                "tier": tier_val,
                "urban_score": r.get("urban_score"),
                "is_capital": to_bool(r.get("is_capital", False)),
                "source": r.get("source", "BPS Bali 2024"),
            })
        upsert(pcur, "kecamatan", pg_rows, "code", cols)

        # ============================================================
        # 3. KELURAHAN
        # ============================================================
        print("\n[3/7] Syncing kelurahan...")
        scur.execute("SELECT * FROM Kelurahan")
        rows = scur.fetchall()
        tier_map = {1: "1", 2: "2", 3: "3"}
        cols = ["id", "code", "name", "kec_code", "kec_name", "kab_code", "kab_name",
                "province", "country", "city", "tier", "lat", "lng", "population",
                "area_km2", "density", "urban_index", "income_index", "tourist_index",
                "transport_index", "poi_density_index", "is_coastal", "source"]
        pg_rows = []
        for r in rows:
            tier_val = r.get("tier")
            if isinstance(tier_val, int):
                tier_val = tier_map.get(tier_val, "1")
            pg_rows.append({
                "id": r["id"], "code": r["code"], "name": r["name"],
                "kec_code": r["kec_code"], "kec_name": r.get("kec_name"),
                "kab_code": r["kab_code"], "kab_name": r.get("kab_name"),
                "province": "Bali", "country": r.get("country", "Indonesia"),
                "city": r.get("city", ""),
                "tier": tier_val,
                "lat": r["lat"], "lng": r["lng"],
                "population": r.get("population"), "area_km2": r.get("area_km2"),
                "density": r.get("density"),
                "urban_index": r.get("urban_index"),
                "income_index": r.get("income_index"),
                "tourist_index": r.get("tourist_index"),
                "transport_index": r.get("transport_index"),
                "poi_density_index": r.get("poi_density_index"),
                "is_coastal": to_bool(r.get("is_coastal", False)),
                "source": r.get("source", "BPS Bali 2024"),
            })
        upsert(pcur, "kelurahan", pg_rows, "id", cols)

        # ============================================================
        # 4. BRANDS (note: PG uses typical_size_m2, price_segment, brand_strength)
        # ============================================================
        print("\n[4/7] Syncing brands...")
        scur.execute("SELECT * FROM Brand")
        rows = scur.fetchall()
        cols = ["id", "name", "parent", "category", "origin_country", "format",
                "location_preference", "typical_size_m2", "target_audience",
                "price_segment", "brand_strength", "notes", "city", "country",
                "source", "is_active"]
        pg_rows = []
        for r in rows:
            pg_rows.append({
                "id": r["id"], "name": r["name"],
                "parent": r["parent"], "category": r["category"],
                "origin_country": r.get("origin_country"),
                "format": r.get("format"),
                "location_preference": r.get("location_preference"),
                "typical_size_m2": r.get("typical_size_m2"),
                "target_audience": r.get("target_audience"),
                "price_segment": r.get("price_segment"),
                "brand_strength": r.get("brand_strength"),
                "notes": r.get("notes", ""),
                "city": r.get("city", ""),
                "country": r.get("country", "Indonesia"),
                "source": r.get("source", "map.co.id/brands"),
                "is_active": to_bool(True),
            })
        upsert(pcur, "brands", pg_rows, "id", cols)

        # ============================================================
        # 5. MALLS (note: PG has anchor_count, has_cinema, has_supermarket,
        #    has_department_store, visitor_estimate_daily — no total_tenants,
        #    anchor_tenants, parking_capacity)
        # ============================================================
        print("\n[5/7] Syncing malls...")
        scur.execute("SELECT * FROM Mall")
        rows = scur.fetchall()
        cols = ["id", "name", "lat", "lng", "kec", "kab", "city", "country",
                "gla_m2", "opened_year", "class", "anchor_count",
                "has_cinema", "has_supermarket", "has_department_store",
                "visitor_estimate_daily", "notes", "source"]
        pg_rows = []
        for r in rows:
            pg_rows.append({
                "id": r["id"], "name": r["name"],
                "lat": r["lat"], "lng": r["lng"],
                "kec": r.get("kec"), "kab": r.get("kab"),
                "city": r.get("city", ""),
                "country": r.get("country", "Indonesia"),
                "gla_m2": r.get("gla_m2"),
                "opened_year": r.get("opened_year"),
                "class": r.get("class"),
                "anchor_count": r.get("anchor_count", 0),
                "has_cinema": to_bool(r.get("has_cinema", False)),
                "has_supermarket": to_bool(r.get("has_supermarket", False)),
                "has_department_store": to_bool(r.get("has_department_store", False)),
                "visitor_estimate_daily": r.get("visitor_estimate_daily"),
                "notes": r.get("notes", ""),
                "source": r.get("source", "nowbali.co.id"),
            })
        upsert(pcur, "malls", pg_rows, "id", cols)

        # ============================================================
        # 6. POIS (note: PG uses magnitude, not visitor_daily)
        # ============================================================
        print("\n[6/7] Syncing pois...")
        scur.execute("SELECT * FROM Poi")
        rows = scur.fetchall()
        cols = ["id", "name", "type", "lat", "lng", "kec", "kab", "city",
                "country", "magnitude", "notes", "source"]
        pg_rows = []
        for r in rows:
            pg_rows.append({
                "id": r["id"], "name": r["name"], "type": r["type"],
                "lat": r["lat"], "lng": r["lng"],
                "kec": r.get("kec"), "kab": r.get("kab"),
                "city": r.get("city", ""),
                "country": r.get("country", "Indonesia"),
                "magnitude": r.get("magnitude"),
                "notes": r.get("notes", ""),
                "source": r.get("source", "Google Maps POI"),
            })
        upsert(pcur, "pois", pg_rows, "id", cols)

        # ============================================================
        # 7. STORES (the most important missing data!)
        # ============================================================
        print("\n[7/7] Syncing stores...")
        scur.execute("SELECT * FROM Store")
        rows = scur.fetchall()
        cols = ["id", "brand_id", "brand_name", "brand_category", "parent", "name",
                "lat", "lng", "kec", "kab", "city", "country", "is_in_mall",
                "mall_id", "mall_name", "address", "opened_year",
                "estimated_size_m2", "confirmed", "source"]
        pg_rows = []
        for r in rows:
            pg_rows.append({
                "id": r["id"], "brand_id": r["brand_id"],
                "brand_name": r["brand_name"], "brand_category": r.get("brand_category"),
                "parent": r["parent"], "name": r["name"],
                "lat": r["lat"], "lng": r["lng"],
                "kec": r.get("kec", ""), "kab": r.get("kab", ""),
                "city": r.get("city", ""),
                "country": r.get("country", "Indonesia"),
                "is_in_mall": to_bool(r.get("is_in_mall", False)),
                "mall_id": r.get("mall_id"),
                "mall_name": r.get("mall_name"),
                "address": r.get("address", ""),
                "opened_year": r.get("opened_year"),
                "estimated_size_m2": r.get("estimated_size_m2", 0),
                "confirmed": to_bool(r.get("confirmed", False)),
                "source": r.get("source", "map.co.id directory"),
            })
        upsert(pcur, "stores", pg_rows, "id", cols)

        pconn.commit()
        print("\n✓ All data synced successfully!")

        # Verify
        print("\n--- Verification ---")
        for t in ['stores','brands','malls','kabupaten','kelurahan','pois','kecamatan']:
            pcur.execute(f'SELECT count(*) FROM {t}')
            print(f"  {t}: {pcur.fetchone()[0]}")

    except Exception as e:
        pconn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        scur.close(); sconn.close()
        pcur.close(); pconn.close()


if __name__ == "__main__":
    main()
