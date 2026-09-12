import { IAuditService, AuditLogEntry } from '../../domain/ports/IAuditService';
import { prisma } from '../db/prisma';

export class PrismaAuditService implements IAuditService {
  public async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          previousValue: entry.previousValue ? JSON.stringify(entry.previousValue) : null,
          newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      console.error('[PrismaAuditService] Failed to record audit log:', err);
    }
  }

  public async getLogs(limit: number = 50): Promise<any[]> {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            admin: { select: { username: true, department: true } },
          },
        },
      },
    });
  }
}
