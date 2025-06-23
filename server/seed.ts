import { db } from "./db";
import { users, zones, wildlifeQuotas } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      email: "admin@seleapp.com",
      password: adminPassword,
      firstName: "Amministratore",
      lastName: "SeleApp",
      role: "ADMIN",
      isActive: true,
    }).onConflictDoNothing();

    // Create sample hunter
    const hunterPassword = await bcrypt.hash("hunter123", 10);
    await db.insert(users).values({
      email: "mario.rossi@email.com",
      password: hunterPassword,
      firstName: "Mario",
      lastName: "Rossi",
      role: "HUNTER",
      isActive: true,
    }).onConflictDoNothing();

    // Create 16 zones
    const zoneData = Array.from({ length: 16 }, (_, i) => ({
      name: `Zona ${i + 1}`,
      description: `Zona di caccia numero ${i + 1} di Cison di Val Marino`,
      isActive: true,
    }));

    await db.insert(zones).values(zoneData).onConflictDoNothing();

    // Get all zones
    const allZones = await db.select().from(zones);

    // Create wildlife quotas for each zone
    const quotaData = [];
    for (const zone of allZones) {
      // Roe deer quotas
      quotaData.push(
        {
          zoneId: zone.id,
          species: "roe_deer" as const,
          sex: "male" as const,
          ageClass: "adult" as const,
          totalQuota: Math.floor(Math.random() * 5) + 3, // 3-7
          harvested: 0,
          season: "2024-2025",
        },
        {
          zoneId: zone.id,
          species: "roe_deer" as const,
          sex: "female" as const,
          ageClass: "adult" as const,
          totalQuota: Math.floor(Math.random() * 4) + 2, // 2-5
          harvested: 0,
          season: "2024-2025",
        },
        {
          zoneId: zone.id,
          species: "roe_deer" as const,
          sex: "male" as const,
          ageClass: "young" as const,
          totalQuota: Math.floor(Math.random() * 3) + 1, // 1-3
          harvested: 0,
          season: "2024-2025",
        },
        {
          zoneId: zone.id,
          species: "roe_deer" as const,
          sex: "female" as const,
          ageClass: "young" as const,
          totalQuota: Math.floor(Math.random() * 3) + 1, // 1-3
          harvested: 0,
          season: "2024-2025",
        }
      );

      // Red deer quotas (fewer)
      quotaData.push(
        {
          zoneId: zone.id,
          species: "red_deer" as const,
          sex: "male" as const,
          ageClass: "adult" as const,
          totalQuota: Math.floor(Math.random() * 2) + 1, // 1-2
          harvested: 0,
          season: "2024-2025",
        },
        {
          zoneId: zone.id,
          species: "red_deer" as const,
          sex: "female" as const,
          ageClass: "adult" as const,
          totalQuota: Math.floor(Math.random() * 2) + 1, // 1-2
          harvested: 0,
          season: "2024-2025",
        }
      );
    }

    await db.insert(wildlifeQuotas).values(quotaData).onConflictDoNothing();

    console.log("✅ Database seeded successfully!");
    console.log("🔑 Admin credentials: admin@seleapp.com / admin123");
    console.log("🔑 Hunter credentials: mario.rossi@email.com / hunter123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { seed };
