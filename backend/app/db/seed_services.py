import asyncio
import sys
import os

# Ensure the app module is in path when running as a top-level script
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.service_catalog import ServiceCatalog
from app.models.service_addon import ServiceAddon
from app.utils.logger import logger

SERVICES = [
    {
        "name": "Initial Property Audit & Case Study",
        "description": "Phase 1: Preliminary site visit, overall Vastu assessment, and estimation of scope. Mandatory entry point.",
        "base_price": 2000.0,
        "pricing_type": "Fixed",
        "max_free_visits": 1,
        "addons": [
            {"name": "Plot/Land Variant", "price": 2500.0},
            {"name": "Supplementary Site Visit", "price": 500.0}
        ]
    },
    {
        "name": "New Plan Study",
        "description": "Phase 2: Comprehensive Vastu analysis of an architectural plan.",
        "base_price": 2500.0,
        "pricing_type": "Fixed",
        "max_free_visits": 2,
        "addons": [
            {"name": "Supplementary Site Visit", "price": 500.0}
        ]
    },
    {
        "name": "Plan Modification & Remedial Solutions",
        "description": "Phase 2: Actionable solutions to neutralize spatial defects via Vastu remedies or structural shifts.",
        "base_price": 1500.0,  # Room/Zone baseline
        "pricing_type": "Per-Item",
        "max_free_visits": 1,
        "addons": [
            {"name": "Room/Zone Analysis", "price": 1500.0},
            {"name": "Specific Vastu Remedy", "price": 500.0},
            {"name": "Supplementary Site Visit", "price": 500.0}
        ]
    },
    {
        "name": "Interior & Exterior Element Placement",
        "description": "Phase 2: Precise directional placement of interior furnishings and exterior utilities.",
        "base_price": 500.0,  # Individual item baseline
        "pricing_type": "Variant_Fixed",
        "max_free_visits": 1,
        "addons": [
            {"name": "Individual Item Suggestion", "price": 500.0},
            {"name": "Comprehensive Interior Package", "price": 2500.0},
            {"name": "Comprehensive Exterior Package", "price": 2500.0},
            {"name": "Full Property Package", "price": 5000.0},
            {"name": "Supplementary Site Visit", "price": 500.0}
        ]
    },
    {
        "name": "Bundled Packages",
        "description": "Phase 2: Comprehensive end-to-end Vastu consulting bundles (pricing tailored after Initial Audit).",
        "base_price": 0.0,
        "pricing_type": "Custom_Bundle",
        "max_free_visits": 3,
        "addons": [
            {"name": "Pre-Construction Bundle", "price": 5500.0},
            {"name": "Post-Construction Bundle", "price": 7000.0},
            {"name": "Complete Vastu Master Bundle", "price": 10500.0},
            {"name": "Supplementary Site Visit", "price": 500.0}
        ]
    },
]

async def seed_services():
    logger.info("Connecting to database specifically to seed Service Catalog...")
    async with AsyncSessionLocal() as db:
        for s_data in SERVICES:
            result = await db.execute(select(ServiceCatalog).where(ServiceCatalog.name == s_data["name"]))
            existing = result.scalars().first()
            
            # Extract addons before saving
            addons_data = s_data.pop("addons", [])
            
            if not existing:
                logger.info("Adding service: %s", s_data['name'])
                new_service = ServiceCatalog(**s_data)
                db.add(new_service)
                await db.flush() # get ID
                for addon in addons_data:
                    db.add(ServiceAddon(**addon, service_catalog_id=new_service.id))
            else:
                logger.info("Updating service: %s", s_data['name'])
                for k, v in s_data.items():
                    setattr(existing, k, v)
                    
                # Hard replace addons for this seed script to keep it clean
                await db.execute(ServiceAddon.__table__.delete().where(ServiceAddon.service_catalog_id == existing.id))
                for addon in addons_data:
                    db.add(ServiceAddon(**addon, service_catalog_id=existing.id))
        
        # Clean up old exact duplicates created manually during testing earlier 
        # (e.g. if I called "Plot Selection" instead of "Plot Selection Analysis")
        # I'll just rely on the UI to only show active ones, or I could delete them.
        # Here we just keep things safe.

        await db.commit()
    logger.info("Service Catalog Seeding Complete!")

if __name__ == "__main__":
    asyncio.run(seed_services())
