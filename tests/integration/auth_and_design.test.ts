import { describe, it, expect } from 'vitest';
import { SendCustomerOtpUseCase } from '../../src/application/auth/SendCustomerOtpUseCase';
import { VerifyCustomerOtpUseCase } from '../../src/application/auth/VerifyCustomerOtpUseCase';
import { GenerateShopDesignUseCase } from '../../src/application/designer/GenerateShopDesignUseCase';
import { UpdateMaterialPriceUseCase } from '../../src/application/pricing/UpdateMaterialPriceUseCase';
import { prisma } from '../../src/infrastructure/db/prisma';

describe('Integration Tests: Customer Journey & Price Versioning', () => {
  const testMobile = '9876543210';
  let customerId = '';
  let projectId = '';
  let estimateId = '';

  it('1. Sends OTP to customer phone and returns devOtp in dev mode', async () => {
    const result = await SendCustomerOtpUseCase.execute(testMobile);
    expect(result.success).toBe(true);
    expect(result.devOtp).toBeDefined();
    expect(result.devOtp?.length).toBe(6);
  });

  it('2. Verifies OTP and registers/logs in customer', async () => {
    // Re-trigger OTP
    const otpRes = await SendCustomerOtpUseCase.execute(testMobile);
    expect(otpRes.devOtp).toBeDefined();

    const authRes = await VerifyCustomerOtpUseCase.execute({
      mobile: testMobile,
      otp: otpRes.devOtp!,
      fullName: 'Vikram Sharma',
      city: 'Mumbai',
      shopLocation: 'Andheri West, Mumbai',
      businessName: 'Sharma Super Mart',
    });

    expect(authRes.success).toBe(true);
    expect(authRes.token).toBeDefined();
    expect(authRes.user?.customerId).toBeDefined();
    customerId = authRes.user!.customerId;
  });

  it('3. Generates 3 layout options and persists design, racks, and BOM estimate', async () => {
    const designRes = await GenerateShopDesignUseCase.execute({
      customerId,
      storeTypeCode: 'SUPERMARKET',
      budget: 250000,
      shape: 'RECTANGLE',
      dimensions: {
        length: 20, // 20 feet
        breadth: 15, // 15 feet
        height: 10, // 10 feet
        unit: 'FEET',
      },
      openings: [
        { type: 'DOOR_MAIN', wall: 'NORTH', distanceMm: 1200, widthMm: 1200, heightMm: 2100, swingDirection: 'INSIDE' },
        { type: 'WINDOW', wall: 'EAST', distanceMm: 1000, widthMm: 1500, heightMm: 1500, swingDirection: 'NONE' },
      ],
      obstacles: [
        { type: 'PILLAR', posX: 3000, posY: 2200, widthMm: 350, depthMm: 350, heightMm: 3000 },
      ],
      requirements: {
        REQ_GONDOLA_AISLES: true,
        REQ_CHECKOUT_COUNTER: true,
      },
    });

    expect(designRes.success).toBe(true);
    expect(designRes.projectId).toBeDefined();
    expect(designRes.result?.options.length).toBe(3);

    projectId = designRes.projectId!;

    // Check that estimate exists in DB
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        designs: {
          include: {
            versions: {
              include: { estimate: { include: { items: true } }, racks: true },
            },
          },
        },
      },
    });

    expect(project).toBeDefined();
    expect(project?.designs[0].versions.length).toBe(3);
    const v2 = project?.designs[0].versions.find((v) => v.optionType === 'OPTION_B_BALANCED');
    expect(v2?.estimate).toBeDefined();
    expect(v2?.estimate?.items.length).toBeGreaterThan(5);
    estimateId = v2!.estimate!.id;
  });

  it('4. Updates raw material rate with price versioning and preserves existing estimates', async () => {
    const sheetMat = await prisma.material.findUnique({
      where: { code: 'MS_SHEET_CRCA' },
      include: { currentPrice: true },
    });
    expect(sheetMat).toBeDefined();

    const previousRate = sheetMat!.currentPrice!.currentRate;
    const newRate = previousRate + 15; // Price hike

    // Fetch existing estimate items before price update
    const estimateBefore = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { items: true },
    });
    const preUpdateGrandTotal = estimateBefore!.grandTotal;

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    // Execute Price Update
    const updateRes = await UpdateMaterialPriceUseCase.execute({
      materialId: sheetMat!.id,
      adminId: adminUser?.id || 'SYSTEM_ADMIN_TEST',
      newRate,
      changeReason: 'Steel raw material index revision',
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.material.currentRate).toBe(newRate);

    // Verify Price History is preserved in DB (Rule 20)
    const history = await prisma.materialPriceHistory.findMany({
      where: { materialId: sheetMat!.id },
      orderBy: { effectiveDate: 'desc' },
    });
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].newRate).toBe(newRate);
    expect(history[0].previousRate).toBe(previousRate);

    // CRITICAL: Ensure pre-existing estimate grand total has NOT changed (Rule 7 & 20)
    const estimateAfter = await prisma.estimate.findUnique({
      where: { id: estimateId },
    });
    expect(estimateAfter!.grandTotal).toBe(preUpdateGrandTotal);
  });
});
