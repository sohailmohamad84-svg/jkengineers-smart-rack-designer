import { container } from '../../infrastructure/di/container';

export interface UpdateMaterialPriceInput {
  materialId: string;
  adminId: string;
  newRate: number;
  changeReason?: string;
}

export class UpdateMaterialPriceUseCase {
  public static async execute(input: UpdateMaterialPriceInput) {
    if (input.newRate <= 0) {
      throw new Error('Material rate must be a positive number.');
    }

    const updated = await container.materialRepository.updateMaterialPrice({
      materialId: input.materialId,
      newRate: input.newRate,
      previousRate: 0, // Repository loads previous rate from DB
      effectiveDate: new Date(),
      changedByAdminId: input.adminId,
      changeReason: input.changeReason,
    });

    await container.auditService.log({
      actorId: input.adminId,
      actorRole: 'ADMIN',
      action: 'MATERIAL_PRICE_UPDATED',
      entityType: 'Material',
      entityId: input.materialId,
      previousValue: { rate: updated.previousRate },
      newValue: { rate: updated.currentRate, reason: input.changeReason },
    });

    return {
      success: true,
      message: `Price for ${updated.name} updated to ₹${updated.currentRate}/${updated.unit}`,
      material: updated,
    };
  }
}
