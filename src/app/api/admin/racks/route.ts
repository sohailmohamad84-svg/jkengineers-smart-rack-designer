import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';
import { container } from '@/infrastructure/di/container';

export async function GET(req: NextRequest) {
  try {
    const racks = await prisma.rackType.findMany({
      orderBy: { defaultWidthMm: 'asc' },
    });
    return NextResponse.json({ success: true, racks });
  } catch (error) {
    console.error('[API /api/admin/racks GET] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load racks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { code, name, category, defaultWidthMm, defaultHeightMm, defaultDepthMm, defaultShelves, loadCapacityKg, baseCost, active } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, message: 'Rack code and name are required' }, { status: 400 });
    }

    const rack = await prisma.rackType.upsert({
      where: { code },
      update: {
        name,
        category: category || 'WALL_RACK',
        defaultWidthMm: Number(defaultWidthMm) || 900,
        defaultHeightMm: Number(defaultHeightMm) || 2100,
        defaultDepthMm: Number(defaultDepthMm) || 450,
        defaultShelves: Number(defaultShelves) || 5,
        loadCapacityKg: Number(loadCapacityKg) || 70,
        baseCost: Number(baseCost) || 5000,
        active: active !== undefined ? Boolean(active) : true,
      },
      create: {
        code,
        name,
        category: category || 'WALL_RACK',
        defaultWidthMm: Number(defaultWidthMm) || 900,
        defaultHeightMm: Number(defaultHeightMm) || 2100,
        defaultDepthMm: Number(defaultDepthMm) || 450,
        defaultShelves: Number(defaultShelves) || 5,
        loadCapacityKg: Number(loadCapacityKg) || 70,
        baseCost: Number(baseCost) || 5000,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    await container.auditService.log({
      actorId: session!.userId,
      actorRole: 'ADMIN',
      action: 'RACK_CATALOG_UPDATE',
      entityType: 'RackType',
      entityId: rack.id,
      newValue: rack,
    });

    return NextResponse.json({ success: true, rack });
  } catch (error: any) {
    console.error('[API /api/admin/racks POST] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
