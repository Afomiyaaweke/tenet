import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a default super_admin company and user
  const company = await db.company.create({
    data: {
      name: 'Tenet Admin',
      industry: 'Technology',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      verified: true,
      status: 'active',
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const admin = await db.user.create({
    data: {
      email: 'admin@tenet.app',
      passwordHash,
      role: 'super_admin',
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
      jobTitle: 'Super Admin',
      phone: '+251900000000',
      location: 'Addis Ababa',
      verified: true,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);
  console.log(`✅ Created company: ${company.name}`);
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
