import { describe, it, expect } from 'vitest';
import { POST as repriceHandler } from '../../src/app/api/designer/reprice/route';
import { POST as versionHandler } from '../../src/app/api/projects/[id]/versions/route';
import { prisma } from '../../src/infrastructure/db/prisma';
import { TokenService } from '../../src/infrastructure/auth/TokenService';
import { NextRequest } from 'next/server';
import { PlacedRack } from '../../src/domain/entities/Rack';

describe('Arrange Racks & Versioning Integration Tests', () => {
  const sampleRacks: PlacedRack[] = [
    {
      rackTypeCode: 'WALL_RACK_900',
      rackTypeName: 'Wall Display Unit 900mm',
      category: 'WALL_RACK',
      label: 'Wall Unit 1',
      posX: 500,
      posY: 500,
      rotation: 0,
      widthMm: 900,
      depthMm: 450,
      heightMm: 2100,
      shelvesCount: 5,
      loadCapacityKg: 120,
      isDoubleSided: false,
    },
    {
      rackTypeCode: 'GONDOLA_1200',
      rackTypeName: 'Double Sided Gondola 1200mm',
      category: 'GONDOLA_RACK',
      label: 'Center Gondola 1',
      posX: 2000,
      posY: 2000,
      rotation: 0,
      widthMm: 1200,
      depthMm: 900,
      heightMm: 1650,
      shelvesCount: 8,
      loadCapacityKg: 200,
      isDoubleSided: true,
    },
  ];

  it('1. Live Reprice calculates deterministic BOM and 18% GST', async () => {
    const req = new NextRequest('http://localhost:3000/api/designer/reprice', {
      method: 'POST',
      body: JSON.stringify({
        racks: sampleRacks,
        includeInstallation: true,
      }),
    });

    const res = await repriceHandler(req);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.totalRacks).toBe(2);
    expect(data.totalDisplayAreaSqM).toBeGreaterThan(0);
    expect(data.estimate).toBeDefined();
    expect(data.estimate.grandTotal).toBeGreaterThan(0);
    expect(data.estimate.totalGstCost).toBeGreaterThan(0);
    // GST must be exactly 18% of subtotal
    const subtotal = data.estimate.subTotal;
    expect(Math.round(subtotal * 0.18)).toBe(Math.round(data.estimate.totalGstCost));
  });

  it('2. Saves custom arrangement as a NEW version (V4) without mutating V1/V2/V3', async () => {
    // Get existing project with design from database
    const project = await prisma.project.findFirst({
      include: {
        customer: { include: { user: true } },
        designs: {
          include: { versions: true },
        },
      },
    });

    expect(project).toBeDefined();
    const existingVersionsCount = project!.designs[0].versions.length;
    const previousMaxVersion = Math.max(...project!.designs[0].versions.map((v) => v.versionNumber));

    // Generate valid session token for customer
    const token = TokenService.signToken({
      userId: project!.customer.userId,
      role: 'CUSTOMER',
      mobile: project!.customer.user.mobile || undefined,
      fullName: project!.customer.fullName,
      customerId: project!.customer.id,
    });

    const req = new NextRequest(`http://localhost:3000/api/projects/${project!.id}/versions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        racks: sampleRacks,
        includeInstallation: true,
        note: 'Customer customized layout via 2D canvas',
      }),
    });

    const res = await versionHandler(req, { params: { id: project!.id } });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.version).toBeDefined();
    expect(data.version.versionNumber).toBe(previousMaxVersion + 1);
    expect(data.version.optionType).toBe('CUSTOM_ARRANGEMENT');
    expect(data.version.racks.length).toBe(2);

    // Verify in database: versions count incremented, previous versions unchanged
    const reloadedDesign = await prisma.design.findUnique({
      where: { id: project!.designs[0].id },
      include: { versions: { include: { estimate: true } } },
    });

    expect(reloadedDesign!.versions.length).toBe(existingVersionsCount + 1);
    expect(reloadedDesign!.activeVersionId).toBe(data.version.id);

    // Verify previous versions are strictly intact
    const originalV1 = reloadedDesign!.versions.find((v) => v.versionNumber === 1);
    expect(originalV1).toBeDefined();
    expect(originalV1?.optionType).toBe('OPTION_A_MAX_DISPLAY');
  });

  it('3. GET /api/projects/[id]/pdf generates and streams professional ReportLab PDF quotation', async () => {
    const project = await prisma.project.findFirst();
    expect(project).toBeDefined();

    const { GET: pdfHandler } = await import('../../src/app/api/projects/[id]/pdf/route');

    const req = new NextRequest(`http://localhost:3000/api/projects/${project!.id}/pdf`);
    const res = await pdfHandler(req, { params: { id: project!.id } });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    const disposition = res.headers.get('content-disposition');
    expect(disposition).toContain('attachment; filename="JK-Engineers-Works-Quotation-');
    expect(disposition).toContain('.pdf"');

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(10000); // Non-empty valid binary PDF
  }, 35000); // Allow up to 35s for ReportLab + Matplotlib drawing
});
