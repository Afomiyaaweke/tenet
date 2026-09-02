import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * ⚠️ TEMPORARY — ONE-TIME PRODUCTION CLEANUP — DELETE AFTER USE ⚠️
 *
 * POST /api/admin/nuke-all
 *   Wipes ALL fake/test data from the production database.
 *   Preserves ONLY the owner account + profile + company shell so the
 *   owner can still sign in to a clean app.
 *
 * GET /api/admin/nuke-all
 *   Returns per-table row counts (verification snapshot).
 *
 * Both require header:  x-nuke-key: <one-time key>
 * POST also requires body: { "confirm": "PURGE_ALL_FAKE_DATA" }
 */

const NUKE_KEY = 'e0f4ed04b8a33f303ccf14125acffb76';
const KEEP_EMAIL = 'afomiyaaweke20@gmail.com';

// Every content table (everything except User / Profile / Company)
const CONTENT_TABLES = [
  'Document', 'Tender', 'Bid', 'BidAnalysis', 'Project', 'Task', 'TeamMember',
  'Milestone', 'Payment', 'Chat', 'Message', 'Event', 'Registration', 'Comment',
  'Notification', 'Conversation', 'ConversationMember', 'ChatMessage',
  'MessageReaction', 'PasswordResetToken', 'PasswordHistory', 'SavedTender',
  'AuditLog', 'SocialPost', 'SocialPostReaction', 'SocialPostComment',
  'Connection', 'Endorsement', 'Webhook', 'RateLimitConfig', 'Secret',
  'InfraAlert', 'CacheEntry', 'Subscription', 'UsageRecord', 'AgentSession',
  'AgentDocument', 'AgentMessage', 'AgentAnalysis', 'AgentArtifact',
  'ProformaListing',
];
const ALL_TABLES = [...CONTENT_TABLES, 'User', 'Profile', 'Company'];

function authed(req: NextRequest): boolean {
  return req.headers.get('x-nuke-key') === NUKE_KEY;
}

async function tableCounts(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const t of ALL_TABLES) {
    try {
      const rows = await db.$queryRawUnsafe<{ c: number }[]>(
        `SELECT COUNT(*)::int AS c FROM "${t}"`
      );
      result[t] = Number(rows[0]?.c ?? 0);
    } catch {
      result[t] = -1; // table missing / inaccessible
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const owner = await db.user.findUnique({ where: { email: KEEP_EMAIL } });
    return NextResponse.json({
      success: true,
      ownerFound: !!owner,
      counts: await tableCounts(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Count failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== 'PURGE_ALL_FAKE_DATA') {
    return NextResponse.json(
      { success: false, error: 'Send { "confirm": "PURGE_ALL_FAKE_DATA" } to execute' },
      { status: 400 }
    );
  }

  try {
    const before = await tableCounts();

    // Identify the owner account to preserve (login + profile + company shell)
    const owner = await db.user.findUnique({ where: { email: KEEP_EMAIL } });
    const keepUserId = owner?.id ?? '__no_owner__';
    const keepCompanyId = owner?.companyId ?? '__no_company__';

    // 1) Wipe every content table in one statement (CASCADE resolves FK order)
    await db.$executeRawUnsafe(
      `TRUNCATE TABLE ${CONTENT_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
    );

    // 2) Remove every non-owner user / profile / company
    const profiles = await db.profile.deleteMany({ where: { userId: { not: keepUserId } } });
    const users = await db.user.deleteMany({ where: { id: { not: keepUserId } } });
    const companies = await db.company.deleteMany({ where: { id: { not: keepCompanyId } } });

    const after = await tableCounts();

    return NextResponse.json({
      success: true,
      message: 'Production database purged. Only the owner account remains.',
      ownerFound: !!owner,
      keptAccount: owner ? { email: owner.email, companyId: owner.companyId } : null,
      deletedExtra: { profiles: profiles.count, users: users.count, companies: companies.count },
      before,
      after,
    });
  } catch (err) {
    console.error('Nuke-all error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Purge failed' },
      { status: 500 }
    );
  }
}
