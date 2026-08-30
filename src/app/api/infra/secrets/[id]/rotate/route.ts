import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    success: false,
    error: `Secret ${id} not found. No secrets are managed through this endpoint.`,
  }, { status: 404 });
}
