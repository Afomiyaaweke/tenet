import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    success: false,
    error: `Alert ${id} not found. No alerts are currently configured.`,
  }, { status: 404 });
}
