// Re-seed the dev database with the known test accounts.
// Run with: node scripts/seed-dev.cjs
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();

const PASSWORD = 'TestPass123!';

async function main() {
  console.log('Seeding dev DB…');

  // ── 1. Company (for the team_admin account) ──
  let company = await db.company.findFirst({ where: { name: 'TenetBid Test Co' } });
  if (!company) {
    company = await db.company.create({
      data: {
        name: 'TenetBid Test Co',
        industry: 'Procurement',
        country: 'Ethiopia',
        city: 'Addis Ababa',
        email: 'test@tenetbid.com',
        verified: true,
        isPublished: true,
        vanitySlug: 'tenetbid-test-co',
      },
    });
    console.log('  + Company:', company.id);
  }

  // ── 2. Personal test user ──
  const personalHash = await bcrypt.hash(PASSWORD, 12);
  let personalUser = await db.user.findUnique({ where: { email: 'personal@tenetbid.com' } });
  if (!personalUser) {
    personalUser = await db.user.create({
      data: {
        email: 'personal@tenetbid.com',
        passwordHash: personalHash,
        role: 'user',
        accountType: 'personal',
        status: 'active',
        plan: 'free',
        emailVerified: true,
      },
    });
    console.log('  + Personal user:', personalUser.id);
  } else {
    await db.user.update({ where: { id: personalUser.id }, data: { passwordHash: personalHash, status: 'active' } });
    console.log('  ~ Personal user updated:', personalUser.id);
  }

  let personalProfile = await db.profile.findUnique({ where: { userId: personalUser.id } });
  if (!personalProfile) {
    personalProfile = await db.profile.create({
      data: {
        userId: personalUser.id,
        fullName: 'Personal Pat',
        jobTitle: 'Independent Buyer',
        location: 'Hawassa, Ethiopia',
        verified: true,
      },
    });
    console.log('  + Personal profile:', personalProfile.id);
  }

  // ── 3. Company team_admin test user ──
  const companyHash = await bcrypt.hash(PASSWORD, 12);
  let companyUser = await db.user.findUnique({ where: { email: 'test@tenetbid.com' } });
  if (!companyUser) {
    companyUser = await db.user.create({
      data: {
        email: 'test@tenetbid.com',
        passwordHash: companyHash,
        role: 'team_admin',
        accountType: 'company',
        companyId: company.id,
        status: 'active',
        plan: 'free',
        emailVerified: true,
      },
    });
    console.log('  + Company user:', companyUser.id);
  } else {
    await db.user.update({ where: { id: companyUser.id }, data: { passwordHash: companyHash, status: 'active', companyId: company.id } });
    console.log('  ~ Company user updated:', companyUser.id);
  }

  let companyProfile = await db.profile.findUnique({ where: { userId: companyUser.id } });
  if (!companyProfile) {
    companyProfile = await db.profile.create({
      data: {
        userId: companyUser.id,
        companyId: company.id,
        fullName: 'Tenet Admin',
        jobTitle: 'Team Admin',
        location: 'Addis Ababa, Ethiopia',
        verified: true,
      },
    });
    console.log('  + Company profile:', companyProfile.id);
  }

  // ── 4. A sample Proforma listing so the marketplace isn't empty ──
  const existingListing = await db.proformaListing.findFirst({
    where: { userId: companyUser.id, productName: 'Ethiopian Arabica Coffee Beans' },
  });
  if (!existingListing) {
    await db.proformaListing.create({
      data: {
        userId: companyUser.id,
        productName: 'Ethiopian Arabica Coffee Beans',
        description: 'Premium Yirgacheffe single-origin Arabica, washed process. Direct from cooperative farmers in Yirgacheffe, Ethiopia. Available in 60kg bags.',
        category: 'Food & Beverage',
        country: 'Ethiopia',
        city: 'Yirgacheffe',
        quantity: 500,
        unit: 'kg',
        unitPrice: 450,
        currency: 'ETB',
        contactInfo: 'test@tenetbid.com',
        status: 'active',
        imageUrls: '[]',
      },
    });
    console.log('  + Sample listing: Ethiopian Arabica Coffee Beans');
  }

  const counts = {
    users: await db.user.count(),
    companies: await db.company.count(),
    profiles: await db.profile.count(),
    listings: await db.proformaListing.count(),
  };
  console.log('\nDone. Counts:', JSON.stringify(counts, null, 2));
  console.log('\nTest credentials:');
  console.log('  personal : personal@tenetbid.com / ' + PASSWORD);
  console.log('  company  : test@tenetbid.com / ' + PASSWORD);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
