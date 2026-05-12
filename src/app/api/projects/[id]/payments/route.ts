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

    // Only admin or tender_owner can log payments
    if (user!.role !== 'admin' && user!.role !== 'tender_owner') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins or tender owners can log payments' },
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
      include: { bid: { select: { userId: true } } },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Contractor can only view payments for their own projects
    if (user!.role === 'contractor' && project.bid.userId !== user!.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view payments for your own projects' },
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
