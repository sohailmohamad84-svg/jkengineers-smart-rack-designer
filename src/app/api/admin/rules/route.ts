import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';
import { container } from '@/infrastructure/di/container';

export async function GET(req: NextRequest) {
  const { errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { settingKey: 'asc' },
    });

    const storeTypes = await prisma.storeType.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { storeRequirements: true },
    });

    return NextResponse.json({
      success: true,
      settings,
      storeTypes,
    });
  } catch (error) {
    console.error('[API /api/admin/rules GET] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load design rules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { settings } = body; // array of { settingKey, settingValue }

    if (!Array.isArray(settings)) {
      return NextResponse.json({ success: false, message: 'Invalid settings array' }, { status: 400 });
    }

    for (const item of settings) {
      if (item.settingKey && item.settingValue !== undefined) {
        await prisma.systemSetting.upsert({
          where: { settingKey: item.settingKey },
          update: { settingValue: String(item.settingValue) },
          create: {
            settingKey: item.settingKey,
            settingValue: String(item.settingValue),
            description: item.description || 'Configured via Admin Panel',
          },
        });
      }
    }

    await container.auditService.log({
      actorId: session!.userId,
      actorRole: 'ADMIN',
      action: 'DESIGN_RULES_UPDATED',
      entityType: 'SystemSetting',
      entityId: 'SYSTEM_SETTINGS',
      newValue: settings,
    });

    return NextResponse.json({ success: true, message: 'Design rules updated successfully' });
  } catch (error: any) {
    console.error('[API /api/admin/rules POST] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { session, errorResponse } = requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { id, code, name, description, minAisleWidthMm, defaultRackHeightMm, active } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, message: 'Store type code and name are required.' }, { status: 400 });
    }

    const storeType = await prisma.storeType.upsert({
      where: { code },
      update: {
        name,
        description: description || '',
        minAisleWidthMm: Number(minAisleWidthMm) || 1000,
        defaultRackHeightMm: Number(defaultRackHeightMm) || 2100,
        active: active !== undefined ? Boolean(active) : true,
      },
      create: {
        code,
        name,
        description: description || '',
        minAisleWidthMm: Number(minAisleWidthMm) || 1000,
        defaultRackHeightMm: Number(defaultRackHeightMm) || 2100,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    await container.auditService.log({
      actorId: session!.userId,
      actorRole: 'ADMIN',
      action: 'STORE_TYPE_CONFIGURED',
      entityType: 'StoreType',
      entityId: storeType.id,
      newValue: storeType,
    });

    return NextResponse.json({ success: true, storeType });
  } catch (error: any) {
    console.error('[API /api/admin/rules PUT] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
