import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    data: { id, rotatedAt: new Date().toISOString(), newValue: '****************************' },
  });
}
