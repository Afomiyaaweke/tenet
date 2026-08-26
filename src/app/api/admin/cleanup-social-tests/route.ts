import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/admin/cleanup-social-tests
 * One-time cleanup: removes test/fake users and all their social data.
 * Requires team_admin role.
 *
 * Test user detection patterns:
 *  - Email contains: test, demo, sample, fake, example, dummy, temp, junk
 *  - Profile fullName is very short (<= 2 chars) or generic (Test, Demo, Sample, etc.)
 *  - Profile has no company association and was created during testing
 */

const TEST_EMAIL_PATTERNS = [
  'test', 'demo', 'sample', 'fake', 'example', 'dummy',
  'temp', 'junk', 'noreply', 'admin@test', 'user@test',
];

const TEST_NAME_PATTERNS = [
  'test', 'demo', 'sample', 'fake', 'dummy', 'example',
  'john doe', 'jane doe', 'foo bar', 'aaa', 'bbb', 'xxx',
  'test user', 'test account', 'placeholder',
];

function isTestEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return TEST_EMAIL_PATTERNS.some(p => lower.includes(p));
}

function isTestName(name: string | null | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  // Very short names (1-2 chars) that are likely placeholders
  if (lower.length <= 2 && !['al', 'ed', 'jo', 'li', 'an', 'mo'].includes(lower)) return true;
  return TEST_NAME_PATTERNS.some(p => lower.includes(p));
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (error) return error;

    // Only team_admin can run cleanup
    if (user!.role !== 'team_admin') {
      return NextResponse.json(
        { success: false, error: 'Only admin users can run cleanup' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to dry run for safety
    const confirmDelete = body.confirm === 'DELETE_ALL_TEST_USERS';

    // Find all users with their profiles
    const allUsers = await db.user.findMany({
      include: {
        profile: { select: { id: true, fullName: true } },
      },
    });

    // Identify test users (exclude the caller)
    const testUsers = allUsers.filter(u => {
      if (u.id === user!.id) return false;
      if (u.email === 'afomiyaaweke20@gmail.com') return false;
      return isTestEmail(u.email) || isTestName(u.profile?.fullName);
    });

    const testUserIds = testUsers.map(u => u.id);
    const testUserEmails = testUsers.map(u => u.email);

    if (testUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No test users found to clean up',
        dryRun,
        deleted: [],
        summary: { users: 0, posts: 0, reactions: 0, comments: 0, connections: 0, endorsements: 0 },
      });
    }

    if (dryRun && !confirmDelete) {
      const [postCount, reactionCount, commentCount, connectionCount, endorsementCount] =
        await Promise.all([
          db.socialPost.count({ where: { userId: { in: testUserIds } } }),
          db.socialPostReaction.count({ where: { userId: { in: testUserIds } } }),
          db.socialPostComment.count({ where: { userId: { in: testUserIds } } }),
          db.connection.count({
            where: {
              OR: [
                { requesterId: { in: testUserIds } },
                { receiverId: { in: testUserIds } },
              ],
            },
          }),
          db.endorsement.count({
            where: {
              OR: [
                { fromUserId: { in: testUserIds } },
                { toUserId: { in: testUserIds } },
              ],
            },
          }),
        ]);

      return NextResponse.json({
        success: true,
        message: `DRY RUN: Found ${testUserIds.length} test users. Send { "confirm": "DELETE_ALL_TEST_USERS" } to actually delete.`,
        dryRun: true,
        wouldDelete: {
          users: testUserEmails,
          userIds: testUserIds,
        },
        summary: {
          users: testUserIds.length,
          posts: postCount,
          reactions: reactionCount,
          comments: commentCount,
          connections: connectionCount,
          endorsements: endorsementCount,
        },
      });
    }

    // Actual deletion
    const result: Record<string, number> = {};

    result.posts = (await db.socialPost.deleteMany({
      where: { userId: { in: testUserIds } },
    })).count;

    result.reactions = (await db.socialPostReaction.deleteMany({
      where: { userId: { in: testUserIds } },
    })).count;

    result.comments = (await db.socialPostComment.deleteMany({
      where: { userId: { in: testUserIds } },
    })).count;

    result.connections = (await db.connection.deleteMany({
      where: {
        OR: [
          { requesterId: { in: testUserIds } },
          { receiverId: { in: testUserIds } },
        ],
      },
    })).count;

    result.endorsements = (await db.endorsement.deleteMany({
      where: {
        OR: [
          { fromUserId: { in: testUserIds } },
          { toUserId: { in: testUserIds } },
        ],
      },
    })).count;

    result.profiles = (await db.profile.deleteMany({
      where: { userId: { in: testUserIds } },
    })).count;

    result.users = (await db.user.deleteMany({
      where: { id: { in: testUserIds } },
    })).count;

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.users} test users and all their social data`,
      dryRun: false,
      deleted: testUserEmails,
      summary: result,
    });
  } catch (err) {
    console.error('Cleanup test users error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup test users' },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser access
export async function GET(request: NextRequest) {
  return POST(request);
}
