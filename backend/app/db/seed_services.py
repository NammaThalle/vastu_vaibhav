import asyncio
import sys
import os

# Ensure the app module is in path when running as a top-level script
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import AsyncSessionLocal
from app.models.service_catalog import ServiceCatalog

SERVICES = [
    {
        "name": "Plot Selection Analysis",
        "description": "Assessment of raw land or plot. Determines suitability and directional coordinates.",
        "base_price": 3000.0,  # Residential baseline
        "pricing_type": "Variant_Fixed",
    },
    {
        "name": "New Plan Study",
        "description": "Comprehensive Vastu analysis of a client-provided architectural plan.",
        "base_price": 2500.0,
        "pricing_type": "Fixed",
    },
    {
        "name": "Plan Modification & Remedial Solutions",
        "description": "Actionable solutions to neutralize spatial defects via Vastu remedies or structural shifts.",
        "base_price": 1500.0,  # Room/Zone baseline
        "pricing_type": "Per-Item",
    },
    {
        "name": "Interior & Exterior Element Placement",
        "description": "Precise directional placement of interior furnishings and exterior utilities.",
        "base_price": 500.0,  # Individual item baseline
        "pricing_type": "Variant_Fixed",
    },
    {
        "name": "House Vastu Analysis",
        "description": "Pre-purchase complete Vastu check for ready-to-move-in properties.",
        "base_price": 2500.0,
        "pricing_type": "Fixed",
    },
    {
        "name": "Bundled Packages",
        "description": "Comprehensive end-to-end Vastu consulting bundles.",
        "base_price": 0.0,
        "pricing_type": "Custom_Bundle",
    },
]

async def seed_services():
    print("Connecting to database specifically to seed Service Catalog...")
    async with AsyncSessionLocal() as db:
        for s_data in SERVICES:
            result = await db.execute(select(ServiceCatalog).where(ServiceCatalog.name == s_data["name"]))
            existing = result.scalars().first()
            if not existing:
                print(f"Adding service: {s_data['name']}")
                new_service = ServiceCatalog(**s_data)
                db.add(new_service)
            else:
                print(f"Updating service: {s_data['name']}")
                for k, v in s_data.items():
                    setattr(existing, k, v)
        
        # Clean up old exact duplicates created manually during testing earlier 
        # (e.g. if I called "Plot Selection" instead of "Plot Selection Analysis")
        # I'll just rely on the UI to only show active ones, or I could delete them.
        # Here we just keep things safe.

        await db.commit()
    print("Service Catalog Seeding Complete!")

if __name__ == "__main__":
    asyncio.run(seed_services())
