import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const mine = searchParams.get('mine') === 'true';

    const where: Record<string, unknown> = {};

    if (mine) {
      where.userId = user.id;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { organization: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tenders = await db.tender.findMany({
      where,
      include: {
        user: { select: { name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tenders });
  } catch (error) {
    console.error('List tenders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { title, organization, category, deadline, budget, description, requirements, location } = body;

    if (!title || !organization || !category || !deadline || !budget || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tender = await db.tender.create({
      data: {
        title,
        organization,
        category,
        deadline: new Date(deadline),
        budget,
        description,
        requirements: JSON.stringify(requirements || []),
        location: location || '',
        userId: user.id,
      },
      include: {
        user: { select: { name: true, company: true } },
      },
    });

    return NextResponse.json({ tender }, { status: 201 });
  } catch (error) {
    console.error('Create tender error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
