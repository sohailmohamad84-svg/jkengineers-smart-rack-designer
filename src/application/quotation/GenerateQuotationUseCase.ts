import { prisma } from '../../infrastructure/db/prisma';

export class GenerateQuotationUseCase {
  public static async execute(estimateId: string, customTerms?: string, validityDays: number = 15) {
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        designVersion: {
          include: {
            design: {
              include: {
                project: {
                  include: {
                    customer: true,
                    storeType: true,
                    shop: {
                      include: { dimensions: true },
                    },
                  },
                },
              },
            },
          },
        },
        items: true,
      },
    });

    if (!estimate) {
      throw new Error(`Estimate ${estimateId} not found`);
    }

    const project = estimate.designVersion.design.project;
    const count = await prisma.quotation.count();
    const quotationNumber = `Q-JK-2026-${String(count + 1).padStart(5, '0')}`;

    const defaultTerms = `1. Price Validity: This quotation is valid for ${validityDays} days from date of issuance.
2. Delivery & Transit: Delivery within Mumbai Metropolitan Region (MMR) within 10-14 working days from final drawing approval.
3. Quality Standard: Fabricated exclusively from prime standard Tata / JSW Cold Rolled Steel with 7-tank pre-treatment & pure epoxy polyester powder coating (60-80 microns).
4. Payment Terms: 50% advance along with confirmed purchase order; 40% before dispatch; balance 10% upon installation sign-off.
5. Verification Disclaimer: Indicative Online Estimate — Final dimensions, load distribution, and layout clearance subject to physical site measurement and technical verification by JK Engineers Works technicians.`;

    const quotation = await prisma.quotation.upsert({
      where: { estimateId },
      update: {
        termsConditions: customTerms || defaultTerms,
        validityDays,
        status: 'ISSUED',
      },
      create: {
        quotationNumber,
        customerId: project.customerId,
        projectId: project.id,
        estimateId: estimate.id,
        status: 'ISSUED',
        termsConditions: customTerms || defaultTerms,
        validityDays,
      },
      include: {
        customer: true,
        project: {
          include: {
            storeType: true,
            shop: { include: { dimensions: true } },
          },
        },
        estimate: {
          include: { items: true },
        },
      },
    });

    // Update project lead status to QUOTATION_SENT
    await prisma.project.update({
      where: { id: project.id },
      data: { leadStatus: 'QUOTATION_SENT', status: 'QUOTED' },
    });

    return quotation;
  }
}
