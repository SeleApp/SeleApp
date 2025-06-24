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

    console.log(`Created ${allZones.length} hunting zones for Cison di Val Marino`);

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
