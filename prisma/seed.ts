import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function main() {
  console.log ('🌱 Seeding database...');

  // Read admin credentials from environment or generate secure defaults
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tenet.app').trim().toLowerCase();
  const companyName = process.env.ADMIN_COMPANY || 'Tenet Admin';

  // Skip if this admin already exists — makes the seed safe to re-run on every deploy
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`ℹ️  Admin user ${adminEmail} already exists — skipping seed.`);
    console.log('🌱 Seed completed (no-op).');
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('base64url');
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create company, user, and profile together so a failure partway through
  // doesn't leave an orphaned company or user behind
  const { company, admin } = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        industry: 'Technology',
        country: 'Ethiopia',
        city: 'Addis Ababa',
        verified: true,
        status: 'active',
      },
    });

    const admin = await tx.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'team_admin',
        companyId: company.id,
        status: 'active',
        emailVerified: true,
      },
    });

    await tx.profile.create({
      data: {
        userId: admin.id,
        companyId: company.id,
        fullName: 'System Administrator',
        jobTitle: 'Team Admin',
        phone: '+251900000000',
        location: 'Addis Ababa',
        verified: true,
      },
    });

    return { company, admin };
  });

  console.log(`✅ Created admin user: ${admin.email}`);
  console.log(`✅ Created company: ${company.name}`);

  // Only print the password if it was auto-generated (first-time setup)
  if (!process.env.ADMIN_PASSWORD) {
    console.log('');
    console.log('⚠️  ──────────────────────────────────────────────────────────');
    console.log('⚠️  AUTO-GENERATED ADMIN PASSWORD (save this — it won\'t show again):');
    console.log(`⚠️  ${adminPassword}`);
    console.log('⚠️  ──────────────────────────────────────────────────────────');
    console.log('');
    console.log('💡 TIP: Set ADMIN_PASSWORD env var to use a specific password instead.');
  }

  console.log('🌱 Seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
