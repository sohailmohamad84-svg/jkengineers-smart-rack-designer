import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding JK Engineers Works database...');

  // 1. Create Default Admin User
  const adminPasswordHash = await bcrypt.hash('AdminJK@2026', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@jkengineersworks.com' },
    update: {},
    create: {
      email: 'admin@jkengineersworks.com',
      mobile: '9820012345',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
      admin: {
        create: {
          username: 'admin',
          department: 'Executive Design & Production',
          permissions: JSON.stringify(['ALL', 'PRICING_ADMIN', 'CATALOG_ADMIN', 'CRM_ADMIN']),
        },
      },
    },
    include: { admin: true },
  });
  console.log('Admin user seeded:', adminUser.email);

  // 2. Seed Raw Materials
  const rawMaterials = [
    {
      code: 'MS_SHEET_CRCA',
      name: 'Cold Rolled Close Annealed (CRCA) Steel Sheet',
      category: 'STEEL',
      unit: 'KG',
      rate: 85.0,
      notes: 'Prime standard Tata/JSW steel for shelf trays & kick plates',
    },
    {
      code: 'MS_SLOTTED_ANGLE',
      name: 'MS Slotted Angle / Perforated Channel (2.5mm)',
      category: 'STEEL',
      unit: 'KG',
      rate: 92.0,
      notes: 'Structural upright columns & horizontal bracing',
    },
    {
      code: 'MS_ERW_PIPE',
      name: 'MS ERW Heavy Gauge Upright Hollow Section',
      category: 'STEEL',
      unit: 'KG',
      rate: 96.0,
      notes: 'High load capacity tubular columns for gondolas & heavy racks',
    },
    {
      code: 'POWDER_COATING',
      name: 'Pure Epoxy Polyester Powder Coating (7-Tank Process)',
      category: 'FINISH',
      unit: 'SQ_M',
      rate: 45.0,
      notes: 'Anti-corrosive finish, 60-80 microns thickness',
    },
    {
      code: 'BRACKET_HEAVY',
      name: 'Press-formed Cantilever Shelf Bracket',
      category: 'HARDWARE',
      unit: 'PIECE',
      rate: 85.0,
      notes: 'Multi-angle adjustable steel brackets with locking pins',
    },
    {
      code: 'FASTENERS_HARDWARE',
      name: 'High Tensile Fasteners & Leveling Bolt Kit',
      category: 'HARDWARE',
      unit: 'PIECE',
      rate: 18.0,
      notes: 'Nylon base leveling studs and zinc-plated nuts/bolts',
    },
    {
      code: 'FABRICATION_LABOR',
      name: 'Precision Metal Fabrication & Bending Labor',
      category: 'LABOUR',
      unit: 'JOB',
      rate: 650.0,
      notes: 'CNC punching, press-brake bending, and robotic welding',
    },
    {
      code: 'INSTALLATION_LABOR',
      name: 'Professional Site Installation & Erection',
      category: 'LABOUR',
      unit: 'JOB',
      rate: 450.0,
      notes: 'Expert on-site alignment and leveling by JK Engineers technicians',
    },
    {
      code: 'LOCAL_TRANSPORTATION',
      name: 'Packaging & Transit (Mumbai Metropolitan Region)',
      category: 'LOGISTICS',
      unit: 'JOB',
      rate: 3500.0,
      notes: 'Protective bubble & corrugated wrapping + transit within MMR',
    },
  ];

  for (const mat of rawMaterials) {
    const material = await prisma.material.upsert({
      where: { code: mat.code },
      update: { name: mat.name, category: mat.category, unit: mat.unit, notes: mat.notes },
      create: {
        code: mat.code,
        name: mat.name,
        category: mat.category,
        unit: mat.unit,
        notes: mat.notes,
        currentPrice: {
          create: {
            currentRate: mat.rate,
            effectiveDate: new Date(),
          },
        },
      },
      include: { currentPrice: true },
    });

    // Record initial history if none exists
    const historyCount = await prisma.materialPriceHistory.count({
      where: { materialId: material.id },
    });
    if (historyCount === 0) {
      await prisma.materialPriceHistory.create({
        data: {
          materialId: material.id,
          previousRate: mat.rate * 0.95, // 5% lower historical baseline
          newRate: mat.rate,
          effectiveDate: new Date(),
          changedByAdminId: adminUser.admin?.id,
          changeReason: 'Initial benchmark pricing setup for FY 2026',
        },
      });
    }
  }
  console.log(`Seeded ${rawMaterials.length} raw materials with dynamic pricing.`);

  // 3. Seed Rack Types
  const rackCatalog = [
    {
      code: 'WALL_RACK_900',
      name: 'Supermarket Wall Display Rack (900mm)',
      category: 'WALL_RACK',
      defaultWidthMm: 900,
      defaultHeightMm: 2100,
      defaultDepthMm: 450,
      defaultShelves: 5,
      loadCapacityKg: 70,
      isDoubleSided: false,
      baseShelfDepthMm: 450,
      baseCost: 5200,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['SUPERMARKET', 'GROCERY', 'MINI_MART', 'GENERAL_RETAIL']),
    },
    {
      code: 'WALL_RACK_1200',
      name: 'Supermarket Wall Display Rack Wide (1200mm)',
      category: 'WALL_RACK',
      defaultWidthMm: 1200,
      defaultHeightMm: 2100,
      defaultDepthMm: 450,
      defaultShelves: 5,
      loadCapacityKg: 80,
      isDoubleSided: false,
      baseShelfDepthMm: 450,
      baseCost: 6400,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['SUPERMARKET', 'GROCERY', 'MINI_MART', 'GENERAL_RETAIL', 'WAREHOUSE']),
    },
    {
      code: 'GONDOLA_RACK_900',
      name: 'Supermarket Center Gondola (900mm Double-Sided)',
      category: 'GONDOLA_RACK',
      defaultWidthMm: 900,
      defaultHeightMm: 1500,
      defaultDepthMm: 900,
      defaultShelves: 10,
      loadCapacityKg: 70,
      isDoubleSided: true,
      baseShelfDepthMm: 450,
      baseCost: 8900,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['SUPERMARKET', 'GROCERY', 'MINI_MART', 'FMCG']),
    },
    {
      code: 'GONDOLA_RACK_1200',
      name: 'Supermarket Center Gondola Wide (1200mm Double-Sided)',
      category: 'GONDOLA_RACK',
      defaultWidthMm: 1200,
      defaultHeightMm: 1500,
      defaultDepthMm: 900,
      defaultShelves: 10,
      loadCapacityKg: 80,
      isDoubleSided: true,
      baseShelfDepthMm: 450,
      baseCost: 10800,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['SUPERMARKET', 'GROCERY', 'MINI_MART']),
    },
    {
      code: 'GONDOLA_END_RACK',
      name: 'Supermarket End Cap Rack (900mm)',
      category: 'END_RACK',
      defaultWidthMm: 900,
      defaultHeightMm: 1500,
      defaultDepthMm: 450,
      defaultShelves: 5,
      loadCapacityKg: 65,
      isDoubleSided: false,
      baseShelfDepthMm: 450,
      baseCost: 4800,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['SUPERMARKET', 'GROCERY', 'MINI_MART']),
    },
    {
      code: 'MEDICAL_RACK_900',
      name: 'Pharmacy High-Density Drawer & Display Rack',
      category: 'MEDICAL_RACK',
      defaultWidthMm: 900,
      defaultHeightMm: 2100,
      defaultDepthMm: 380,
      defaultShelves: 7,
      loadCapacityKg: 50,
      isDoubleSided: false,
      baseShelfDepthMm: 380,
      baseCost: 6900,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1586015554060-8db665956dc0?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['MEDICAL_STORE', 'COSMETIC_STORE']),
    },
    {
      code: 'GARMENT_DISPLAY_1200',
      name: 'Garment Hanging & Display Modular Rack',
      category: 'GARMENT_RACK',
      defaultWidthMm: 1200,
      defaultHeightMm: 1800,
      defaultDepthMm: 500,
      defaultShelves: 3,
      loadCapacityKg: 60,
      isDoubleSided: false,
      baseShelfDepthMm: 500,
      baseCost: 6200,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['GARMENT_STORE', 'FOOTWEAR_STORE']),
    },
    {
      code: 'CHECKOUT_COUNTER_STD',
      name: 'Heavy-Duty Retail Checkout Cash Desk Counter',
      category: 'CHECKOUT_COUNTER',
      defaultWidthMm: 1500,
      defaultHeightMm: 900,
      defaultDepthMm: 750,
      defaultShelves: 2,
      loadCapacityKg: 150,
      isDoubleSided: false,
      baseShelfDepthMm: 750,
      baseCost: 14500,
      finish: 'POWDER_COATED',
      imageMain: 'https://images.unsplash.com/photo-1556742049-0a67e557224f?w=800&auto=format&fit=crop&q=60',
      compatibleStoreTypes: JSON.stringify(['ALL']),
    },
  ];

  for (const rack of rackCatalog) {
    await prisma.rackType.upsert({
      where: { code: rack.code },
      update: rack,
      create: rack,
    });
  }
  console.log(`Seeded ${rackCatalog.length} rack specifications.`);

  // 4. Seed Store Types & Requirements
  const storeTypes = [
    {
      code: 'SUPERMARKET',
      name: 'Supermarket',
      description: 'Multi-category retail grocery, FMCG, fresh produce with central gondola aisles & end-caps.',
      minAisleWidthMm: 1050,
      defaultRackHeightMm: 2100,
      recommendedRacks: JSON.stringify(['WALL_RACK_900', 'GONDOLA_RACK_900', 'GONDOLA_END_RACK', 'CHECKOUT_COUNTER_STD']),
      icon: 'ShoppingCart',
      displayOrder: 1,
      requirements: [
        { code: 'REQ_GONDOLA_AISLES', label: 'Central Double-Sided Gondola Aisles', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_END_CAPS', label: 'Promotional Gondola End-Cap Racks', type: 'BOOLEAN', def: 'true', req: false },
        { code: 'REQ_CHECKOUT_COUNTER', label: 'Cash Desk / Billing Counter', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_TROLLEY_AREA', label: 'Shopping Trolley / Basket Queue Area', type: 'BOOLEAN', def: 'true', req: false },
      ],
    },
    {
      code: 'GROCERY',
      name: 'Grocery Store / Kirana',
      description: 'High-density daily essentials, grains, packaged food with wall display & compact island units.',
      minAisleWidthMm: 900,
      defaultRackHeightMm: 2100,
      recommendedRacks: JSON.stringify(['WALL_RACK_900', 'WALL_RACK_1200', 'GONDOLA_RACK_900', 'CHECKOUT_COUNTER_STD']),
      icon: 'Store',
      displayOrder: 2,
      requirements: [
        { code: 'REQ_WALL_RACKS', label: 'Perimeter Wall Display Racks', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_GRAIN_BINS', label: 'Heavy Duty Loose Grain / Bin Section', type: 'BOOLEAN', def: 'true', req: false },
        { code: 'REQ_FRONT_COUNTER', label: 'Front Billing / Service Counter', type: 'BOOLEAN', def: 'true', req: true },
      ],
    },
    {
      code: 'MEDICAL_STORE',
      name: 'Medical Store / Pharmacy',
      description: 'Prescription dispensing, high-density compartmentalized drawer racks & front customer counter.',
      minAisleWidthMm: 850,
      defaultRackHeightMm: 2100,
      recommendedRacks: JSON.stringify(['MEDICAL_RACK_900', 'WALL_RACK_900', 'CHECKOUT_COUNTER_STD']),
      icon: 'Cross',
      displayOrder: 3,
      requirements: [
        { code: 'REQ_MEDICINE_DRAWERS', label: 'High-Density Medicine Drawer Units', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_DISPENSING_COUNTER', label: 'Front Prescription Dispensing Counter', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_REFRIGERATOR_ZONE', label: 'Vaccine / Cold Storage Refrigerator Zone', type: 'BOOLEAN', def: 'true', req: false },
        { code: 'REQ_WAITING_BENCH', label: 'Customer Waiting Zone', type: 'BOOLEAN', def: 'false', req: false },
      ],
    },
    {
      code: 'GARMENT_STORE',
      name: 'Garment & Apparel Store',
      description: 'Hanging display units, folded garment wall racks, trial room clearance & boutique styling.',
      minAisleWidthMm: 1000,
      defaultRackHeightMm: 1800,
      recommendedRacks: JSON.stringify(['GARMENT_DISPLAY_1200', 'WALL_RACK_900', 'CHECKOUT_COUNTER_STD']),
      icon: 'Shirt',
      displayOrder: 4,
      requirements: [
        { code: 'REQ_HANGING_RACKS', label: 'Hanging Modular Display Racks', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_FOLDED_STACKS', label: 'Folded Apparel Flat Shelving', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_TRIAL_ROOM', label: 'Trial Room Clearance Area', type: 'BOOLEAN', def: 'true', req: false },
        { code: 'REQ_CASH_COUNTER', label: 'Boutique Billing Counter', type: 'BOOLEAN', def: 'true', req: true },
      ],
    },
    {
      code: 'MINI_MART',
      name: 'Mini Mart / Convenience Store',
      description: 'Quick-stop retail with optimized perimeter flow and central impulse snack gondolas.',
      minAisleWidthMm: 950,
      defaultRackHeightMm: 2100,
      recommendedRacks: JSON.stringify(['WALL_RACK_900', 'GONDOLA_RACK_900', 'CHECKOUT_COUNTER_STD']),
      icon: 'ShoppingBag',
      displayOrder: 5,
      requirements: [
        { code: 'REQ_WALL_RACKS', label: 'Perimeter Wall Racks', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_CENTER_GONDOLA', label: 'Impulse Central Gondola', type: 'BOOLEAN', def: 'true', req: false },
        { code: 'REQ_BILLING_DESK', label: 'Quick-Pay Checkout Desk', type: 'BOOLEAN', def: 'true', req: true },
      ],
    },
    {
      code: 'WAREHOUSE',
      name: 'Warehouse / Industrial Storage',
      description: 'Heavy duty slotted angle & beam racks for high-volume palletized or boxed inventory.',
      minAisleWidthMm: 1200,
      defaultRackHeightMm: 2400,
      recommendedRacks: JSON.stringify(['WALL_RACK_1200']),
      icon: 'Boxes',
      displayOrder: 6,
      requirements: [
        { code: 'REQ_HEAVY_BEAMS', label: 'Heavy Duty Structural Uprights', type: 'BOOLEAN', def: 'true', req: true },
        { code: 'REQ_FORKLIFT_AISLE', label: 'Wide Material Handling Aisle', type: 'BOOLEAN', def: 'true', req: true },
      ],
    },
  ];

  for (const st of storeTypes) {
    const store = await prisma.storeType.upsert({
      where: { code: st.code },
      update: {
        name: st.name,
        description: st.description,
        minAisleWidthMm: st.minAisleWidthMm,
        defaultRackHeightMm: st.defaultRackHeightMm,
        recommendedRacks: st.recommendedRacks,
        icon: st.icon,
        displayOrder: st.displayOrder,
      },
      create: {
        code: st.code,
        name: st.name,
        description: st.description,
        minAisleWidthMm: st.minAisleWidthMm,
        defaultRackHeightMm: st.defaultRackHeightMm,
        recommendedRacks: st.recommendedRacks,
        icon: st.icon,
        displayOrder: st.displayOrder,
      },
    });

    for (const req of st.requirements) {
      await prisma.storeRequirement.upsert({
        where: {
          storeTypeId_code: {
            storeTypeId: store.id,
            code: req.code,
          },
        },
        update: {
          label: req.label,
          requirementType: req.type,
          defaultValue: req.def,
          isRequired: req.req,
        },
        create: {
          storeTypeId: store.id,
          code: req.code,
          label: req.label,
          requirementType: req.type,
          defaultValue: req.def,
          isRequired: req.req,
        },
      });
    }
  }
  console.log(`Seeded ${storeTypes.length} store types and their specific requirements.`);

  // 5. Seed System Settings
  const settings = [
    { key: 'GST_RATE_PERCENTAGE', val: '18', desc: 'Standard Goods & Services Tax (GST) in India' },
    { key: 'COMPANY_NAME', val: 'JK Engineers Works', desc: 'Official registered entity name' },
    { key: 'COMPANY_LOCATION', val: 'Mumbai, Maharashtra, India', desc: 'Factory & Head Office' },
    { key: 'COMPANY_PHONE', val: '+91 7942546295', desc: 'Customer support & inquiry phone' },
    { key: 'MIN_SAFE_AISLE_MM', val: '800', desc: 'Absolute minimum aisle clearance under fire safety rules' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.key },
      update: { settingValue: s.val, description: s.desc },
      create: { settingKey: s.key, settingValue: s.val, description: s.desc },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
