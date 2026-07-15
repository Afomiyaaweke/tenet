import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/tenders
 * Any authenticated user can create a tender
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const {
      title,
      scope,
      budgetMin,
      budgetMax,
      deadline,
      location,
      categoryTags,
      requiredDocs,
      status,
      documentIds,
    } = body;

    if (!title || !scope || budgetMin === undefined || budgetMax === undefined || !deadline || !location || !categoryTags) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, scope, budgetMin, budgetMax, deadline, location, categoryTags' },
        { status: 400 }
      );
    }

    if (Number(budgetMin) < 0 || Number(budgetMax) < 0 || Number(budgetMin) > Number(budgetMax)) {
      return NextResponse.json(
        { success: false, error: 'Invalid budget range: budgetMin must be <= budgetMax and both non-negative' },
        { status: 400 }
      );
    }

    const tender = await db.tender.create({
      data: {
        title,
        scope,
        budgetMin: parseFloat(String(budgetMin)),
        budgetMax: parseFloat(String(budgetMax)),
        deadline: new Date(deadline),
        location,
        categoryTags,
        requiredDocs: requiredDocs || '',
        status: status || 'open',
        createdBy: user!.id,
        companyId: user!.companyId || null,
      },
      include: {
        documents: true,
        _count: { select: { bids: true } },
      },
    });

    // If documentIds were provided (pre-uploaded before tender creation), link them now
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      await db.document.updateMany({
        where: {
          id: { in: documentIds },
          userId: user!.id,
          tenderId: null, // only link unlinked docs
        },
        data: {
          tenderId: tender.id,
        },
      });
    }

    return NextResponse.json(
      { success: true, data: tender },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create tender error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the tender' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenders
 * List tenders with search, filtering, sorting, and pagination
 * Contractors get matchScore based on skill tag overlap
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const minBudget = searchParams.get('minBudget');
    const maxBudget = searchParams.get('maxBudget');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    let orConditions: Record<string, unknown>[] | null = null;

    // Company isolation: non-team_admin users see their own company's tenders + open tenders from other companies
    if (user!.role !== 'team_admin' && user!.companyId) {
      orConditions = [
        { companyId: user!.companyId },
        { status: 'open' },
      ];
    }

    if (search) {
      const searchConditions = [
        { title: { contains: search } },
        { scope: { contains: search } },
        { location: { contains: search } },
      ];
      // If we already have an OR (from company filter), we need to combine with AND
      if (orConditions) {
        where.AND = orConditions.map((cond: Record<string, unknown>) => ({
          ...cond,
          OR: searchConditions,
        }));
      } else {
        where.OR = searchConditions;
      }
    } else if (orConditions) {
      where.OR = orConditions;
    }

    if (category) {
      where.categoryTags = { contains: category };
    }

    if (status) {
      where.status = status;
    }

    if (minBudget) {
      where.budgetMin = { ...(where.budgetMin || {}), gte: parseFloat(minBudget) };
    }

    if (maxBudget) {
      where.budgetMax = { ...(where.budgetMax || {}), lte: parseFloat(maxBudget) };
    }

    // Determine sort order
    let orderBy: Record<string, string>;
    switch (sortBy) {
      case 'deadline':
        orderBy = { deadline: 'asc' };
        break;
      case 'budget':
        orderBy = { budgetMax: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [tenders, total] = await Promise.all([
      db.tender.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: { select: { bids: true } },
        },
      }),
      db.tender.count({ where }),
    ]);

    // Add matchScore for standard users
    let resultTenders: Record<string, unknown>[] = tenders;
    if (user!.role === 'user' && user!.profile?.skillTags) {
      const userSkills = (user!.profile.skillTags as string)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      resultTenders = tenders.map((tender) => {
        const tenderTags = (tender.categoryTags as string)
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        const overlap = tenderTags.filter((tag) => userSkills.includes(tag)).length;
        const matchScore = tenderTags.length > 0 ? Math.round((overlap / tenderTags.length) * 100) : 0;

        return { ...tender, matchScore };
      });

      // Sort by matchScore if sortBy is relevance and user
      if (sortBy === 'relevance') {
        resultTenders.sort((a, b) => ((b.matchScore as number) || 0) - ((a.matchScore as number) || 0));
      }
    }

    return NextResponse.json({
      success: true,
      data: resultTenders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List tenders error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching tenders' },
      { status: 500 }
    );
  }
}
