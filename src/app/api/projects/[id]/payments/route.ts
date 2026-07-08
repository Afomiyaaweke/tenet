import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/projects/[id]/payments
 * Admin/TenderOwner: Log payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Only team_admin or super_admin can log payments
    if (user!.role !== 'super_admin' && user!.role !== 'team_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can log payments' },
        { status: 403 }
      );
    }

    const { id: projectId } = await params;

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-super_admin can only log payments in their own company's projects
    if (user!.role !== 'super_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only log payments for your own company\'s projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, paymentMethod, referenceNumber, notes, paymentDate } = body;

    if (!amount || !paymentMethod || !paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, paymentMethod, paymentDate' },
        { status: 400 }
      );
    }

    const validMethods = ['bank_transfer', 'cbe_birr', 'cash', 'check'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    const payment = await db.payment.create({
      data: {
        projectId,
        amount: parseFloat(String(amount)),
        paymentMethod,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        paymentDate: new Date(paymentDate),
      },
    });

    return NextResponse.json(
      { success: true, data: payment },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create payment error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while logging the payment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/payments
 * List payments for project (all authorized users)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { id: projectId } = await params;

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Company isolation: non-super_admin can only view payments in their own company's projects
    if (user!.role !== 'super_admin' && user!.companyId && project.companyId !== user!.companyId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this project\'s payments' },
        { status: 403 }
      );
    }

    const payments = await db.payment.findMany({
      where: { projectId },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (err) {
    console.error('List payments error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching payments' },
      { status: 500 }
    );
  }
}
