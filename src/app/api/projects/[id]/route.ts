import { NextRequest, NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth-guard';
import { prisma } from '@/infrastructure/db/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, errorResponse } = requireCustomer(req);
  if (errorResponse) return errorResponse;

  try {
    let project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        storeType: { include: { storeRequirements: true } },
        shop: {
          include: {
            dimensions: true,
            openings: true,
            obstacles: true,
          },
        },
        designs: {
          include: {
            versions: {
              include: {
                estimate: {
                  include: { items: true },
                },
                racks: {
                  include: { rackType: true },
                },
              },
            },
          },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If not found by projectId, check if params.id is a quotationId
    if (!project) {
      const quotation = await prisma.quotation.findUnique({
        where: { id: params.id },
        select: { projectId: true },
      });

      if (quotation) {
        project = await prisma.project.findUnique({
          where: { id: quotation.projectId },
          include: {
            customer: true,
            storeType: { include: { storeRequirements: true } },
            shop: {
              include: {
                dimensions: true,
                openings: true,
                obstacles: true,
              },
            },
            designs: {
              include: {
                versions: {
                  include: {
                    estimate: {
                      include: { items: true },
                    },
                    racks: {
                      include: { rackType: true },
                    },
                  },
                },
              },
            },
            quotations: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }
    }

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }

    // Role security check: customers can only view their own projects, admins can view all
    if (session!.role === 'CUSTOMER' && project.customer.userId !== session!.userId) {
      return NextResponse.json({ success: false, message: 'Forbidden access to project' }, { status: 403 });
    }

    // Augment estimates with subTotal and disclaimer for frontend safety
    const sanitizedProject = {
      ...project,
      designs: project.designs.map((d) => ({
        ...d,
        versions: d.versions.map((v) => {
          if (!v.estimate) return v;
          const subTotal = Math.round(v.estimate.grandTotal - (v.estimate.totalGstCost || 0));
          return {
            ...v,
            estimate: {
              ...v.estimate,
              subTotal,
              disclaimer:
                'This quotation is an indicative engineering estimate based on client-provided shop dimensions. Final fabrication and material billing will be reconciled post physical site laser verification.',
            },
          };
        }),
      })),
    };

    return NextResponse.json({ success: true, project: sanitizedProject });
  } catch (error) {
    console.error('[API /api/projects/:id GET] Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve project details' }, { status: 500 });
  }
}
