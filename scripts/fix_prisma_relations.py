#!/usr/bin/env python3
"""
Fix Prisma schema: replace lowercase table name references in relation fields
with PascalCase model names.

Also fixes:
- mall_tenants field name issue (`all_id` should be `mall_id`)
- Relation field types (e.g., `stores` → `Store`, `ml_models` → `MLModel`)
"""
import re

SCHEMA_PATH = "/home/z/my-project/prisma/schema.prisma"

# Mapping: lowercase_table_name -> PascalCase_model_name
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
}

with open(SCHEMA_PATH, "r") as f:
    content = f.read()

# Fix relation field types
# Pattern: `  fieldName  lowercase_table_name  @relation(...)` or `  fieldName  lowercase_table_name?  @relation(...)`
# or `  fieldName  lowercase_table_name[]`
for lower, pascal in sorted(MODEL_MAP.items(), key=lambda x: -len(x[0])):
    # Replace type references in field declarations
    # Match: word boundary + lowercase_name + (optional ? or []) + whitespace
    content = re.sub(
        rf'\b{lower}(\?|\[\]|\s+@relation)',
        rf'{pascal}\1',
        content
    )

# Fix the typo: `all_id` -> `mall_id` in MallTenant model
content = content.replace("all_id]", "mall_id]")
content = content.replace("fields: [all_id]", "fields: [mall_id]")

# Fix: `fields: odel_id]` typo (should be `fields: [model_id]`)
content = content.replace("fields: odel_id]", "fields: [model_id]")
content = content.replace("fields: all_id]", "fields: [mall_id]")

with open(SCHEMA_PATH, "w") as f:
    f.write(content)

print("✓ Fixed relation field types and typos")
