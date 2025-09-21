// ABOUTME: Database seeding script for ProfiCo Inventory Management System
// ABOUTME: Creates initial data for development and testing including users, teams, and sample equipment

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create teams
  const developmentTeam = await prisma.team.upsert({
    where: { name: "Development" },
    update: {},
    create: {
      name: "Development",
    },
  });

  const marketingTeam = await prisma.team.upsert({
    where: { name: "Marketing" },
    update: {},
    create: {
      name: "Marketing",
    },
  });

  // Create users (authentication via magic links)
  await prisma.user.upsert({
    where: { email: "admin@profico.com" },
    update: {},
    create: {
      email: "admin@profico.com",
      name: "Admin User",
      role: "admin",
    },
  });

  const teamLead = await prisma.user.upsert({
    where: { email: "lead@profico.com" },
    update: {},
    create: {
      email: "lead@profico.com",
      name: "Team Lead",
      role: "team_lead",
      teamId: developmentTeam.id,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: "user@profico.com" },
    update: {},
    create: {
      email: "user@profico.com",
      name: "Regular User",
      role: "user",
      teamId: developmentTeam.id,
    },
  });

  const marketingUser = await prisma.user.upsert({
    where: { email: "marketing@profico.com" },
    update: {},
    create: {
      email: "marketing@profico.com",
      name: "Marketing User",
      role: "user",
      teamId: marketingTeam.id,
    },
  });

  // Create sample equipment
  const laptop1 = await prisma.equipment.create({
    data: {
      serialNumber: "PFC-LAPTOP-001",
      name: "MacBook Pro 16-inch",
      brand: "Apple",
      model: "MacBook Pro 16-inch (2023)",
      category: "computers",
      purchaseDate: new Date("2023-01-15"),
      purchaseMethod: "company_card",
      purchasePrice: 2999.0,
      currentOwnerId: regularUser.id,
      status: "assigned",
      specifications: JSON.stringify({
        processor: "Apple M2 Pro",
        memory: "32GB",
        storage: "1TB SSD",
        display: "16-inch Liquid Retina XDR",
      }),
      tags: {
        create: [
          { name: "ProfiCo" },
          { name: "Development" },
        ],
      },
      condition: "excellent",
    },
  });

  await prisma.equipment.create({
    data: {
      serialNumber: "PFC-LAPTOP-002",
      name: "Dell XPS 13",
      brand: "Dell",
      model: "XPS 13 (9320)",
      category: "computers",
      purchaseDate: new Date("2023-03-10"),
      purchaseMethod: "company_card",
      purchasePrice: 1599.0,
      status: "available",
      specifications: JSON.stringify({
        processor: "Intel Core i7-1260P",
        memory: "16GB",
        storage: "512GB SSD",
        display: "13.4-inch FHD+",
      }),
      tags: {
        create: [
          { name: "ProfiCo" },
        ],
      },
      condition: "good",
    },
  });

  const monitor = await prisma.equipment.create({
    data: {
      serialNumber: "PFC-MON-001",
      name: "LG UltraWide Monitor",
      brand: "LG",
      model: "34WN80C-B",
      category: "peripherals",
      purchaseDate: new Date("2023-02-20"),
      purchaseMethod: "company_card",
      purchasePrice: 449.0,
      currentOwnerId: teamLead.id,
      status: "assigned",
      specifications: JSON.stringify({
        size: "34-inch",
        resolution: "3440x1440",
        connection: "USB-C, HDMI",
      }),
      tags: {
        create: [
          { name: "ProfiCo" },
        ],
      },
      condition: "excellent",
    },
  });

  // Create equipment history
  await prisma.equipmentHistory.create({
    data: {
      equipmentId: laptop1.id,
      toUserId: regularUser.id,
      action: "assigned",
      condition: "excellent",
      notes: "Initial assignment to development team member",
    },
  });

  await prisma.equipmentHistory.create({
    data: {
      equipmentId: monitor.id,
      toUserId: teamLead.id,
      action: "assigned",
      condition: "excellent",
      notes: "Assigned to team lead for development work",
    },
  });

  // Create sample subscriptions
  await prisma.subscription.create({
    data: {
      softwareName: "GitHub Pro",
      assignedUserId: teamLead.id,
      assignedUserEmail: teamLead.email,
      price: 21.0,
      billingFrequency: "monthly",
      paymentMethod: "company_card",
      invoiceRecipient: "accounting@profico.com",
      isReimbursement: false,
      renewalDate: new Date("2024-10-19"),
      vendor: "GitHub",
    },
  });

  await prisma.subscription.create({
    data: {
      softwareName: "Adobe Creative Cloud",
      assignedUserId: marketingUser.id,
      assignedUserEmail: marketingUser.email,
      price: 599.88,
      billingFrequency: "yearly",
      paymentMethod: "company_card",
      invoiceRecipient: "accounting@profico.com",
      isReimbursement: false,
      renewalDate: new Date("2024-12-01"),
      vendor: "Adobe",
    },
  });

  // Create sample equipment request
  await prisma.equipmentRequest.create({
    data: {
      requesterId: marketingUser.id,
      equipmentType: "MacBook Air",
      justification:
        "Need a portable laptop for client presentations and design work",
      status: "pending",
      priority: "medium",
    },
  });

  // Create small inventory items
  await prisma.smallInventoryItem.createMany({
    data: [
      {
        name: "USB-C Dongles",
        category: "accessories",
        currentStock: 15,
        minStock: 5,
        unitPrice: 25.0,
        location: "Office Supply Cabinet",
      },
      {
        name: "Lightning Cables",
        category: "accessories",
        currentStock: 8,
        minStock: 3,
        unitPrice: 15.0,
        location: "Office Supply Cabinet",
      },
      {
        name: "Wireless Mice",
        category: "peripherals",
        currentStock: 12,
        minStock: 5,
        unitPrice: 35.0,
        location: "IT Storage Room",
      },
    ],
  });

  console.log("✅ Database seed completed successfully!");
  console.log(`👥 Created ${await prisma.user.count()} users`);
  console.log(`🏢 Created ${await prisma.team.count()} teams`);
  console.log(`💻 Created ${await prisma.equipment.count()} equipment items`);
  console.log(`💿 Created ${await prisma.subscription.count()} subscriptions`);
  console.log(`📋 Created ${await prisma.equipmentRequest.count()} requests`);
  console.log(
    `📦 Created ${await prisma.smallInventoryItem.count()} small inventory items`
  );
  console.log("\n🔐 Test accounts created (authentication via magic links):");
  console.log("Email: admin@profico.com, Role: admin");
  console.log("Email: lead@profico.com, Role: team_lead");
  console.log("Email: user@profico.com, Role: user");
  console.log("Email: marketing@profico.com, Role: user");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
