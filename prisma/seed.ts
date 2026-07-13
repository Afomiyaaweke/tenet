import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function main() {
  console.log('🌱 Seeding database...');

  // Read admin credentials from environment or generate secure defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tenet.app';
  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('base64url');
  const companyName = process.env.ADMIN_COMPANY || 'Tenet Admin';

  // Create a default team_admin company and user
  const company = await db.company.create({
    data: {
      name: companyName,
      industry: 'Technology',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      verified: true,
      status: 'active',
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await db.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: 'team_admin',
      companyId: company.id,
      status: 'active',
      emailVerified: true,
    },
  });

  await db.profile.create({
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

  console.log(`✅ Created admin user: ${adminEmail}`);
  console.log(`✅ Created company: ${companyName}`);

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
