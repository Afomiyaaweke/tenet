import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json({
    success: true,
    data: { id, acknowledged: body.acknowledged || false, resolved: body.resolved || false, updatedAt: new Date().toISOString() },
  });
}
