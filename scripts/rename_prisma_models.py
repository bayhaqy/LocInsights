#!/usr/bin/env python3
"""
Add @@map directives to Prisma schema to map PascalCase model names
to lowercase PostgreSQL table names.

Also renames models from snake_case to PascalCase to match existing API code.
"""
import re

SCHEMA_PATH = "/home/z/my-project/prisma/schema.prisma"

# Mapping: current_name -> PascalCase_name (what the API code expects)
MODEL_MAP = {
    "countries": "Country",
    "provinces": "Province",
    "kabupaten": "Kabupaten",
    "kecamatan": "Kecamatan",
    "kelurahan": "Kelurahan",
    "brands": "Brand",
    "malls": "Mall",
    "stores": "Store",
    "pois": "Poi",
    "competitor_stores": "CompetitorStore",
    "mall_tenants": "MallTenant",
    "ml_models": "MLModel",
    "training_runs": "TrainingRun",
    "predictions": "Prediction",
    "reports": "Report",
    "scraper_runs": "ScraperRun",
    "field_surveys": "FieldSurvey",
    "ab_tests": "ABTest",
    "staging_stores": "StagingStore",
    "staging_competitors": "StagingCompetitor",
    "staging_malls": "StagingMall",
    # Skip spatial_ref_sys (PostGIS internal table)
}

with open(SCHEMA_PATH, "r") as f:
    content = f.read()

lines = content.split("\n")
new_lines = []
current_model = None
skip_model = False

for i, line in enumerate(lines):
    # Detect model declaration
    m = re.match(r'^model\s+(\w+)\s*\{', line)
    if m:
        old_name = m.group(1)
        if old_name == "spatial_ref_sys":
            skip_model = True
            new_lines.append(f"// Skipped: {old_name} (PostGIS internal table)")
            continue
        
        new_name = MODEL_MAP.get(old_name, old_name)
        current_model = old_name
        # Rename model and add @@map
        new_lines.append(f"model {new_name} {{")
        new_lines.append(f"  @@map(\"{old_name}\")")
        continue
    
    if skip_model:
        if line.strip() == "}":
            skip_model = False
        continue
    
    # Skip @@index lines that reference raw SQL (gin_trgm_ops) — Prisma can't handle these properly
    if "@@index" in line and "gin_trgm_ops" in line:
        continue
    
    new_lines.append(line)

with open(SCHEMA_PATH, "w") as f:
    f.write("\n".join(new_lines))

print("✓ Schema updated with @@map directives")
print(f"  Models: {list(MODEL_MAP.values())}")
