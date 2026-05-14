import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up existing data (reverse order of dependencies)
  console.log('🧹 Cleaning existing data...')
  await db.notification.deleteMany()
  await db.registration.deleteMany()
  await db.message.deleteMany()
  await db.chat.deleteMany()
  await db.payment.deleteMany()
  await db.milestone.deleteMany()
  await db.task.deleteMany()
  await db.project.deleteMany()
  await db.bid.deleteMany()
  await db.tender.deleteMany()
  await db.document.deleteMany()
  await db.profile.deleteMany()
  await db.user.deleteMany()

  // ==========================================
  // 1. USERS
  // ==========================================
  console.log('👤 Creating users...')

  const saltRounds = 12
  const adminHash = await bcrypt.hash('Admin@123', saltRounds)
  const contractor1Hash = await bcrypt.hash('Pass@123', saltRounds)
  const contractor2Hash = await bcrypt.hash('Pass@123', saltRounds)
  const contractor3Hash = await bcrypt.hash('Pass@123', saltRounds)
  const tenderOwner1Hash = await bcrypt.hash('Pass@123', saltRounds)

  const admin = await db.user.create({
    data: {
      email: 'admin@tenet.com',
      passwordHash: adminHash,
      role: 'admin',
      status: 'active',
      emailVerified: true,
    },
  })

  const contractor1 = await db.user.create({
    data: {
      email: 'abel@contractor.com',
      passwordHash: contractor1Hash,
      role: 'contractor',
      status: 'active',
      emailVerified: true,
    },
  })

  const contractor2 = await db.user.create({
    data: {
      email: 'selam@contractor.com',
      passwordHash: contractor2Hash,
      role: 'contractor',
      status: 'active',
      emailVerified: true,
    },
  })

  const contractor3 = await db.user.create({
    data: {
      email: 'dawit@contractor.com',
      passwordHash: contractor3Hash,
      role: 'contractor',
      status: 'active',
      emailVerified: true,
    },
  })

  const tenderOwner1 = await db.user.create({
    data: {
      email: 'mengistu@company.com',
      passwordHash: tenderOwner1Hash,
      role: 'tender_owner',
      status: 'active',
      emailVerified: true,
    },
  })

  console.log(`  ✓ Created 5 users`)

  // ==========================================
  // 2. PROFILES
  // ==========================================
  console.log('📋 Creating profiles...')

  await db.profile.create({
    data: {
      userId: admin.id,
      type: 'individual',
      fullName: 'Ato Dereje Bekele',
      phone: '+251911000001',
      location: 'Addis Ababa',
      address: 'Bole Road, Tenet HQ',
      bio: 'Platform administrator overseeing the Tenet Tender Ecosystem.',
      verified: true,
    },
  })

  await db.profile.create({
    data: {
      userId: contractor1.id,
      type: 'company',
      fullName: 'Abel Tesfaye',
      companyName: 'EthioBuild Construction PLC',
      phone: '+251922000001',
      location: 'Addis Ababa',
      address: 'Cazanchis, Bole Sub City, Addis Ababa',
      tinNumber: 'TIN-00123456',
      licenseNumber: 'LIC-2024-0789',
      skillTags: 'Construction,Engineering,Project Management',
      bio: 'Leading construction company with 15+ years of experience in commercial and residential building projects across Ethiopia.',
      verified: true,
    },
  })

  await db.profile.create({
    data: {
      userId: contractor2.id,
      type: 'company',
      fullName: 'Selamawit Girma',
      companyName: 'TechBridge Solutions',
      phone: '+251933000002',
      location: 'Addis Ababa',
      address: 'Meskel Square, Kirkos Sub City, Addis Ababa',
      tinNumber: 'TIN-00234567',
      licenseNumber: 'LIC-2024-0456',
      skillTags: 'IT,Consulting,Telecommunications',
      bio: 'Technology solutions provider specializing in ICT infrastructure, system integration, and digital transformation consulting.',
      verified: true,
    },
  })

  await db.profile.create({
    data: {
      userId: contractor3.id,
      type: 'company',
      fullName: 'Dawit Amare',
      companyName: 'Global Supply Chain Ltd',
      phone: '+251944000003',
      location: 'Dire Dawa',
      address: 'Kebele 04, Dire Dawa',
      tinNumber: 'TIN-00345678',
      licenseNumber: 'LIC-2024-0123',
      skillTags: 'Supply,Logistics',
      bio: 'Supply chain and logistics company focused on procurement and distribution across Ethiopia.',
      verified: false,
    },
  })

  await db.profile.create({
    data: {
      userId: tenderOwner1.id,
      type: 'company',
      fullName: 'Mengistu Haile',
      companyName: 'Ethiopian Development Corporation',
      phone: '+251955000004',
      location: 'Addis Ababa',
      address: 'Africa Avenue, Yeka Sub City, Addis Ababa',
      tinNumber: 'TIN-00456789',
      licenseNumber: 'LIC-2024-0321',
      bio: 'Government development corporation responsible for major infrastructure and development projects.',
      verified: true,
    },
  })

  console.log('  ✓ Created 5 profiles')

  // ==========================================
  // 3. DOCUMENTS
  // ==========================================
  console.log('📄 Creating documents...')

  // Approved documents for contractor1 (Abel - verified)
  await db.document.create({
    data: {
      userId: contractor1.id,
      docType: 'business_license',
      fileUrl: '/uploads/abel_business_license.pdf',
      fileName: 'EthioBuild_Business_License_2024.pdf',
      status: 'approved',
      reviewNotes: 'Valid business license verified.',
      reviewedAt: new Date('2025-01-15'),
    },
  })

  await db.document.create({
    data: {
      userId: contractor1.id,
      docType: 'tax_clearance',
      fileUrl: '/uploads/abel_tax_clearance.pdf',
      fileName: 'EthioBuild_Tax_Clearance_2024.pdf',
      status: 'approved',
      reviewNotes: 'Tax clearance document is up to date.',
      reviewedAt: new Date('2025-01-16'),
    },
  })

  // Approved documents for contractor2 (Selam - verified)
  await db.document.create({
    data: {
      userId: contractor2.id,
      docType: 'business_license',
      fileUrl: '/uploads/selam_business_license.pdf',
      fileName: 'TechBridge_Business_License_2024.pdf',
      status: 'approved',
      reviewNotes: 'Business license confirmed valid.',
      reviewedAt: new Date('2025-01-20'),
    },
  })

  await db.document.create({
    data: {
      userId: contractor2.id,
      docType: 'certificate',
      fileUrl: '/uploads/selam_iso_cert.pdf',
      fileName: 'TechBridge_ISO27001_Certificate.pdf',
      status: 'approved',
      reviewNotes: 'ISO 27001 certification verified.',
      reviewedAt: new Date('2025-01-22'),
    },
  })

  // Pending document for contractor3 (Dawit - NOT verified)
  await db.document.create({
    data: {
      userId: contractor3.id,
      docType: 'business_license',
      fileUrl: '/uploads/dawit_business_license.pdf',
      fileName: 'GlobalSupply_Business_License_2024.pdf',
      status: 'pending',
    },
  })

  await db.document.create({
    data: {
      userId: contractor3.id,
      docType: 'tax_clearance',
      fileUrl: '/uploads/dawit_tax_clearance.pdf',
      fileName: 'GlobalSupply_Tax_Clearance_2024.pdf',
      status: 'pending',
    },
  })

  // Portfolio document for contractor1
  await db.document.create({
    data: {
      userId: contractor1.id,
      docType: 'portfolio',
      fileUrl: '/uploads/abel_portfolio.pdf',
      fileName: 'EthioBuild_Project_Portfolio.pdf',
      status: 'approved',
      reviewNotes: 'Portfolio shows relevant experience.',
      reviewedAt: new Date('2025-01-18'),
    },
  })

  console.log('  ✓ Created 7 documents')

  // ==========================================
  // 4. TENDERS
  // ==========================================
  console.log('📋 Creating tenders...')

  const now = new Date()
  const pastDate = (daysAgo: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    return d
  }
  const futureDate = (daysAhead: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + daysAhead)
    return d
  }

  const tender1 = await db.tender.create({
    data: {
      title: 'Office Building Construction - Bole District',
      scope: 'Construction of a modern 8-story office building in the Bole District of Addis Ababa. The project includes foundation work, structural framework, exterior and interior finishing, electrical installation, plumbing, HVAC systems, elevator installation, and landscaping. The building should meet international green building standards and accommodate approximately 200 office units. Bidders must demonstrate experience in similar large-scale commercial construction projects within the last 5 years.',
      budgetMin: 2000000,
      budgetMax: 5000000,
      deadline: futureDate(30),
      location: 'Addis Ababa, Bole District',
      categoryTags: 'Construction,Engineering',
      requiredDocs: 'business_license,tax_clearance,portfolio',
      status: 'open',
      createdBy: admin.id,
      createdAt: pastDate(15),
    },
  })

  const tender2 = await db.tender.create({
    data: {
      title: 'National ICT Infrastructure Upgrade',
      scope: 'Comprehensive upgrade of the national ICT infrastructure including fiber optic cable installation, data center modernization, network security enhancement, and cloud migration services. The project covers major cities including Addis Ababa, Dire Dawa, and Hawassa. Vendors must have proven track record in large-scale ICT deployments and relevant certifications (ISO 27001, ITIL).',
      budgetMin: 1000000,
      budgetMax: 3000000,
      deadline: futureDate(25),
      location: 'Nationwide',
      categoryTags: 'IT,Telecommunications',
      requiredDocs: 'business_license,certificate',
      status: 'open',
      createdBy: admin.id,
      createdAt: pastDate(10),
    },
  })

  const tender3 = await db.tender.create({
    data: {
      title: 'Medical Supply Procurement',
      scope: 'Procurement of essential medical supplies and equipment for regional hospitals. Items include surgical instruments, diagnostic equipment, pharmaceutical storage systems, and patient monitoring devices. Suppliers must comply with Ethiopian Food and Drug Authority (EFDA) regulations and provide warranty and maintenance support for all equipment.',
      budgetMin: 500000,
      budgetMax: 1500000,
      deadline: futureDate(20),
      location: 'Addis Ababa',
      categoryTags: 'Supply,Healthcare',
      requiredDocs: 'business_license,tax_clearance',
      status: 'open',
      createdBy: admin.id,
      createdAt: pastDate(7),
    },
  })

  const tender4 = await db.tender.create({
    data: {
      title: 'Road Construction Project - Oromia Region',
      scope: 'Construction of a 120km asphalt road connecting major towns in the Oromia region. The project involves surveying, earthworks, drainage systems, pavement construction, bridge construction at 3 river crossings, and installation of road signage and safety features. Environmental impact assessment compliance is mandatory. Bidders must demonstrate capacity for large-scale road construction.',
      budgetMin: 10000000,
      budgetMax: 25000000,
      deadline: futureDate(45),
      location: 'Oromia Region',
      categoryTags: 'Construction,Engineering',
      requiredDocs: 'business_license,tax_clearance,portfolio,certificate',
      status: 'open',
      createdBy: admin.id,
      createdAt: pastDate(5),
    },
  })

  const tender5 = await db.tender.create({
    data: {
      title: 'University Campus Development Consulting',
      scope: 'Consulting services for the master plan development of a new university campus. The scope includes architectural planning, infrastructure design, environmental sustainability assessment, and project management advisory. The consultant will work closely with the university board and government stakeholders to deliver a comprehensive development plan within 6 months.',
      budgetMin: 800000,
      budgetMax: 2000000,
      deadline: pastDate(5), // deadline already passed
      location: 'Amhara Region, Bahir Dar',
      categoryTags: 'Consulting,Education',
      requiredDocs: 'business_license,certificate',
      status: 'closed',
      createdBy: admin.id,
      createdAt: pastDate(30),
    },
  })

  const tender6 = await db.tender.create({
    data: {
      title: 'Water Supply System Installation',
      scope: 'Installation of a complete water supply and distribution system for a mid-sized town. The project includes well drilling, pump station construction, water treatment facility, storage tank construction, and pipeline installation spanning 25km. The system should serve approximately 50,000 residents. Contractors must have experience in water infrastructure projects and hold relevant certifications.',
      budgetMin: 3000000,
      budgetMax: 8000000,
      deadline: pastDate(60), // deadline long passed
      location: 'SNNPR, Wolayta Zone',
      categoryTags: 'Construction,Engineering',
      requiredDocs: 'business_license,tax_clearance,portfolio',
      status: 'awarded',
      createdBy: admin.id,
      createdAt: pastDate(90),
    },
  })

  console.log('  ✓ Created 6 tenders')

  // ==========================================
  // 5. BIDS
  // ==========================================
  console.log('💰 Creating bids...')

  // Bids on Tender 1 (Office Building - open)
  const bid1 = await db.bid.create({
    data: {
      tenderId: tender1.id,
      userId: contractor1.id,
      technicalProposal: 'EthioBuild Construction PLC proposes to deliver the 8-story office building using reinforced concrete structure with modern architectural design. Our approach includes: Phase 1 - Foundation and structural work (3 months), Phase 2 - Exterior and MEP systems (4 months), Phase 3 - Interior finishing and landscaping (3 months). We have completed 12 similar projects in Addis Ababa with an excellent safety and quality record.',
      financialProposal: 3500000,
      timeline: '10 months',
      status: 'pending_review',
      createdAt: pastDate(5),
    },
  })

  // Bid on Tender 2 (ICT - open) by contractor2
  const bid2 = await db.bid.create({
    data: {
      tenderId: tender2.id,
      userId: contractor2.id,
      technicalProposal: 'TechBridge Solutions proposes a phased approach to the national ICT infrastructure upgrade. Phase 1: Assessment and planning (1 month). Phase 2: Fiber optic backbone installation (3 months). Phase 3: Data center modernization (2 months). Phase 4: Cloud migration and security (2 months). Our team includes 15 certified network engineers and 8 cloud architects with proven experience in similar deployments.',
      financialProposal: 2200000,
      timeline: '8 months',
      status: 'shortlisted',
      createdAt: pastDate(8),
    },
  })

  // Bid on Tender 3 (Medical Supply - open) by contractor3
  const bid3 = await db.bid.create({
    data: {
      tenderId: tender3.id,
      userId: contractor3.id,
      technicalProposal: 'Global Supply Chain Ltd proposes to source and deliver all required medical supplies within the specified timeframe. We have established partnerships with leading medical equipment manufacturers and can ensure EFDA-compliant products with full warranty coverage. Our logistics network covers all major Ethiopian cities.',
      financialProposal: 1200000,
      timeline: '4 months',
      status: 'pending_review',
      createdAt: pastDate(3),
    },
  })

  // Bid on Tender 4 (Road - open) by contractor1
  const bid4 = await db.bid.create({
    data: {
      tenderId: tender4.id,
      userId: contractor1.id,
      technicalProposal: 'EthioBuild Construction PLC is well-positioned to execute this 120km road construction project. Our heavy machinery fleet and experienced road construction team have completed over 500km of road projects across Ethiopia. We propose using hot-mix asphalt technology with proper drainage infrastructure. Environmental compliance measures are integrated into every phase.',
      financialProposal: 18000000,
      timeline: '18 months',
      status: 'pending_review',
      createdAt: pastDate(2),
    },
  })

  // Bid on Tender 5 (University - closed) by contractor2
  const bid5 = await db.bid.create({
    data: {
      tenderId: tender5.id,
      userId: contractor2.id,
      technicalProposal: 'TechBridge Solutions offers comprehensive consulting services for university campus development. Our team includes architects, urban planners, and sustainability experts. We propose a 6-month engagement with deliverables including master plan, feasibility study, environmental assessment, and implementation roadmap.',
      financialProposal: 1500000,
      timeline: '6 months',
      status: 'rejected',
      rejectionNote: 'Proposal did not meet the minimum technical score requirement. Insufficient experience in educational facility planning.',
      createdAt: pastDate(25),
    },
  })

  // Bid on Tender 5 by contractor1 (also rejected since it's closed)
  const bid5b = await db.bid.create({
    data: {
      tenderId: tender5.id,
      userId: contractor1.id,
      technicalProposal: 'EthioBuild Construction PLC proposes to provide consulting services for the university campus development project. We have experience in educational infrastructure and can deliver a comprehensive master plan. Our team includes certified project managers and construction engineers.',
      financialProposal: 1800000,
      timeline: '6 months',
      status: 'shortlisted',
      createdAt: pastDate(22),
    },
  })

  // Bid on Tender 6 (Water Supply - awarded) by contractor1 - THIS IS THE AWARDED BID
  const bid6 = await db.bid.create({
    data: {
      tenderId: tender6.id,
      userId: contractor1.id,
      technicalProposal: 'EthioBuild Construction PLC proposes to install a complete water supply system serving 50,000 residents. Our approach includes: hydrogeological survey and well drilling, pump station with backup generators, water treatment plant with capacity of 5,000m³/day, elevated storage tanks, and 25km distribution pipeline. We have successfully completed 3 similar water infrastructure projects in the SNNPR region.',
      financialProposal: 5500000,
      timeline: '14 months',
      status: 'awarded',
      createdAt: pastDate(80),
    },
  })

  // Another bid on Tender 6 by contractor2 - rejected
  const bid6b = await db.bid.create({
    data: {
      tenderId: tender6.id,
      userId: contractor2.id,
      technicalProposal: 'TechBridge Solutions proposes a technology-driven water management system. While our primary expertise is in ICT, we have partnered with experienced water infrastructure firms for the physical installation components. Our contribution would focus on smart monitoring and automated control systems.',
      financialProposal: 7000000,
      timeline: '16 months',
      status: 'rejected',
      rejectionNote: 'Proposal exceeded budget maximum. Primary expertise does not align with core water infrastructure requirements.',
      createdAt: pastDate(78),
    },
  })

  // Bid on Tender 2 by contractor1
  const bid2b = await db.bid.create({
    data: {
      tenderId: tender2.id,
      userId: contractor1.id,
      technicalProposal: 'EthioBuild Construction offers to support the physical infrastructure components of the ICT upgrade, including data center construction and cable pathway installation. We would partner with ICT specialists for the technology deployment aspects.',
      financialProposal: 2800000,
      timeline: '9 months',
      status: 'pending_review',
      createdAt: pastDate(4),
    },
  })

  console.log('  ✓ Created 9 bids')

  // ==========================================
  // 6. PROJECT (from awarded bid)
  // ==========================================
  console.log('🏗️ Creating project...')

  const project1 = await db.project.create({
    data: {
      tenderId: tender6.id,
      bidId: bid6.id,
      status: 'active',
      contractValue: bid6.financialProposal,
      createdAt: pastDate(50),
    },
  })

  console.log('  ✓ Created 1 project')

  // ==========================================
  // 7. TASKS
  // ==========================================
  console.log('📌 Creating tasks...')

  await db.task.create({
    data: {
      projectId: project1.id,
      title: 'Complete hydrogeological survey',
      description: 'Conduct detailed hydrogeological survey of the area to identify optimal well drilling locations and assess groundwater availability.',
      status: 'done',
      dueDate: pastDate(35),
      order: 1,
      createdAt: pastDate(50),
    },
  })

  await db.task.create({
    data: {
      projectId: project1.id,
      title: 'Drill production wells',
      description: 'Drill 3 production wells based on survey results. Each well should have minimum yield of 20 liters/second.',
      status: 'done',
      dueDate: pastDate(20),
      order: 2,
      createdAt: pastDate(50),
    },
  })

  await db.task.create({
    data: {
      projectId: project1.id,
      title: 'Construct pump station and treatment facility',
      description: 'Build pump station with backup generators and water treatment plant with 5,000m³/day capacity.',
      status: 'in_progress',
      dueDate: futureDate(15),
      order: 3,
      createdAt: pastDate(50),
    },
  })

  await db.task.create({
    data: {
      projectId: project1.id,
      title: 'Install distribution pipeline',
      description: 'Install 25km of distribution pipeline connecting the treatment facility to the town distribution network.',
      status: 'in_progress',
      dueDate: futureDate(30),
      order: 4,
      createdAt: pastDate(50),
    },
  })

  await db.task.create({
    data: {
      projectId: project1.id,
      title: 'Construct elevated storage tanks',
      description: 'Build 2 elevated storage tanks with combined capacity of 2,000m³ for water pressure management.',
      status: 'todo',
      dueDate: futureDate(45),
      order: 5,
      createdAt: pastDate(50),
    },
  })

  await db.task.create({
    data: {
      projectId: project1.id,
      title: 'System testing and commissioning',
      description: 'Complete system testing, water quality verification, and handover to local water authority.',
      status: 'todo',
      dueDate: futureDate(60),
      order: 6,
      createdAt: pastDate(50),
    },
  })

  console.log('  ✓ Created 6 tasks')

  // ==========================================
  // 8. MILESTONES
  // ==========================================
  console.log('🎯 Creating milestones...')

  await db.milestone.create({
    data: {
      projectId: project1.id,
      title: 'Site Survey & Well Drilling Complete',
      dueDate: pastDate(20),
      completed: true,
      createdAt: pastDate(50),
    },
  })

  await db.milestone.create({
    data: {
      projectId: project1.id,
      title: 'Pump Station & Treatment Facility Operational',
      dueDate: futureDate(15),
      completed: false,
      createdAt: pastDate(50),
    },
  })

  await db.milestone.create({
    data: {
      projectId: project1.id,
      title: 'Pipeline Installation Complete',
      dueDate: futureDate(30),
      completed: false,
      createdAt: pastDate(50),
    },
  })

  await db.milestone.create({
    data: {
      projectId: project1.id,
      title: 'Project Handover & Commissioning',
      dueDate: futureDate(60),
      completed: false,
      createdAt: pastDate(50),
    },
  })

  console.log('  ✓ Created 4 milestones')

  // ==========================================
  // 9. PAYMENTS
  // ==========================================
  console.log('💳 Creating payments...')

  await db.payment.create({
    data: {
      projectId: project1.id,
      amount: 1650000,
      paymentMethod: 'bank_transfer',
      referenceNumber: 'CBE-TRF-2025-001',
      notes: 'Mobilization advance - 30% of contract value upon project kickoff.',
      paymentDate: pastDate(48),
      createdAt: pastDate(48),
    },
  })

  await db.payment.create({
    data: {
      projectId: project1.id,
      amount: 1100000,
      paymentMethod: 'bank_transfer',
      referenceNumber: 'CBE-TRF-2025-002',
      notes: 'First milestone payment - Site survey and well drilling completed.',
      paymentDate: pastDate(18),
      createdAt: pastDate(18),
    },
  })

  await db.payment.create({
    data: {
      projectId: project1.id,
      amount: 1375000,
      paymentMethod: 'bank_transfer',
      referenceNumber: 'CBE-TRF-2025-003',
      notes: 'Second milestone payment - Pump station and treatment facility construction progress (partial).',
      paymentDate: pastDate(5),
      createdAt: pastDate(5),
    },
  })

  console.log('  ✓ Created 3 payments')

  // ==========================================
  // 10. CHAT & MESSAGES
  // ==========================================
  console.log('💬 Creating chat and messages...')

  const chat1 = await db.chat.create({
    data: {
      projectId: project1.id,
      contextType: 'project',
      createdAt: pastDate(45),
    },
  })

  await db.message.create({
    data: {
      chatId: chat1.id,
      userId: contractor1.id,
      content: 'Good morning! I wanted to give you an update on the water supply project. The hydrogeological survey has been completed successfully. We identified 4 potential well locations.',
      createdAt: pastDate(40),
    },
  })

  await db.message.create({
    data: {
      chatId: chat1.id,
      userId: admin.id,
      content: 'Thank you for the update, Abel. That\'s great progress! When do you expect to start drilling?',
      createdAt: pastDate(39),
    },
  })

  await db.message.create({
    data: {
      chatId: chat1.id,
      userId: contractor1.id,
      content: 'We plan to mobilize the drilling equipment next week. The drilling should take approximately 3-4 weeks for all three production wells. I\'ll send you the detailed schedule by Friday.',
      createdAt: pastDate(38),
    },
  })

  await db.message.create({
    data: {
      chatId: chat1.id,
      userId: admin.id,
      content: 'Sounds good. Please make sure all safety protocols are in place before starting. Also, remember to submit the monthly progress report by the 5th.',
      createdAt: pastDate(37),
    },
  })

  await db.message.create({
    data: {
      chatId: chat1.id,
      userId: contractor1.id,
      content: 'Absolutely, safety is our top priority. We\'ve already conducted the safety briefing with all team members. The progress report will be submitted on time. The pump station foundation work is also starting this week.',
      createdAt: pastDate(15),
    },
  })

  await db.message.create({
    data: {
      chatId: chat1.id,
      userId: admin.id,
      content: 'Excellent work! The payments for the first milestone have been processed. Let me know if you need any support from our side.',
      createdAt: pastDate(14),
    },
  })

  console.log('  ✓ Created 1 chat with 6 messages')

  // ==========================================
  // 11. EVENTS
  // ==========================================
  console.log('📅 Creating events...')

  const event1 = await db.event.create({
    data: {
      title: 'Public Procurement Best Practices Workshop',
      description: 'A comprehensive workshop covering the latest public procurement regulations, bid preparation strategies, and compliance requirements in Ethiopia. Participants will learn about the new procurement proclamation and its implications for contractors and tender owners.',
      eventDate: futureDate(14),
      location: 'Hyatt Regency Addis Ababa, Conference Hall A',
      capacity: 100,
      status: 'upcoming',
      category: 'workshop',
      createdAt: pastDate(10),
    },
  })

  const event2 = await db.event.create({
    data: {
      title: 'Digital Transformation in Construction - Training',
      description: 'Hands-on training session on using digital tools for construction project management, including BIM (Building Information Modeling), project scheduling software, and IoT-based site monitoring. Bring your laptop for practical exercises.',
      eventDate: futureDate(28),
      location: 'ICT Park, Training Center, Addis Ababa',
      capacity: 50,
      status: 'upcoming',
      category: 'training',
      createdAt: pastDate(7),
    },
  })

  const event3 = await db.event.create({
    data: {
      title: 'Tender Compliance & Documentation Seminar',
      description: 'A seminar focused on understanding tender compliance requirements, document preparation, and common mistakes that lead to bid disqualification. Features case studies from successful bids and expert panel discussion.',
      eventDate: pastDate(10),
      location: 'Hilton Addis Ababa, Seminar Room B',
      capacity: 80,
      status: 'completed',
      category: 'seminar',
      createdAt: pastDate(30),
    },
  })

  console.log('  ✓ Created 3 events')

  // Event registrations
  await db.registration.create({
    data: {
      eventId: event1.id,
      userId: contractor1.id,
      attended: false,
      createdAt: pastDate(5),
    },
  })

  await db.registration.create({
    data: {
      eventId: event1.id,
      userId: contractor2.id,
      attended: false,
      createdAt: pastDate(3),
    },
  })

  await db.registration.create({
    data: {
      eventId: event3.id,
      userId: contractor1.id,
      attended: true,
      createdAt: pastDate(20),
    },
  })

  await db.registration.create({
    data: {
      eventId: event3.id,
      userId: contractor2.id,
      attended: true,
      createdAt: pastDate(18),
    },
  })

  await db.registration.create({
    data: {
      eventId: event3.id,
      userId: contractor3.id,
      attended: false,
      createdAt: pastDate(15),
    },
  })

  console.log('  ✓ Created 5 event registrations')

  // ==========================================
  // 12. NOTIFICATIONS
  // ==========================================
  console.log('🔔 Creating notifications...')

  // Admin notifications
  await db.notification.create({
    data: {
      userId: admin.id,
      title: 'New Bid Submitted',
      message: 'A new bid has been submitted for "Office Building Construction - Bole District" by EthioBuild Construction PLC.',
      type: 'info',
      link: '/tenders/' + tender1.id,
      createdAt: pastDate(5),
    },
  })

  await db.notification.create({
    data: {
      userId: admin.id,
      title: 'Document Pending Review',
      message: 'Global Supply Chain Ltd has submitted 2 documents pending your review. Please review and approve or reject them.',
      type: 'warning',
      link: '/documents',
      createdAt: pastDate(3),
    },
  })

  await db.notification.create({
    data: {
      userId: admin.id,
      title: 'Bid Shortlisted',
      message: 'TechBridge Solutions has been shortlisted for the "National ICT Infrastructure Upgrade" tender.',
      type: 'success',
      link: '/tenders/' + tender2.id,
      createdAt: pastDate(2),
    },
  })

  // Contractor1 (Abel) notifications
  await db.notification.create({
    data: {
      userId: contractor1.id,
      title: 'Bid Submitted Successfully',
      message: 'Your bid for "Office Building Construction - Bole District" has been submitted and is under review.',
      type: 'info',
      link: '/tenders/' + tender1.id,
      createdAt: pastDate(5),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor1.id,
      title: 'Project Payment Received',
      message: 'A payment of ETB 1,100,000 has been processed for the Water Supply System Installation project.',
      type: 'success',
      link: '/projects/' + project1.id,
      createdAt: pastDate(18),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor1.id,
      title: 'Workshop Registration Confirmed',
      message: 'Your registration for "Public Procurement Best Practices Workshop" has been confirmed.',
      type: 'info',
      link: '/events/' + event1.id,
      createdAt: pastDate(5),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor1.id,
      title: 'New Tender Published',
      message: 'A new tender "Road Construction Project - Oromia Region" has been published that matches your skills.',
      type: 'info',
      link: '/tenders/' + tender4.id,
      createdAt: pastDate(5),
    },
  })

  // Contractor2 (Selam) notifications
  await db.notification.create({
    data: {
      userId: contractor2.id,
      title: 'Bid Shortlisted',
      message: 'Congratulations! Your bid for "National ICT Infrastructure Upgrade" has been shortlisted.',
      type: 'success',
      link: '/tenders/' + tender2.id,
      createdAt: pastDate(2),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor2.id,
      title: 'Bid Rejected',
      message: 'Your bid for "University Campus Development Consulting" was not selected. Reason: Did not meet minimum technical score requirement.',
      type: 'alert',
      link: '/tenders/' + tender5.id,
      createdAt: pastDate(10),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor2.id,
      title: 'Workshop Registration Confirmed',
      message: 'Your registration for "Public Procurement Best Practices Workshop" has been confirmed.',
      type: 'info',
      link: '/events/' + event1.id,
      createdAt: pastDate(3),
    },
  })

  // Contractor3 (Dawit) notifications
  await db.notification.create({
    data: {
      userId: contractor3.id,
      title: 'Bid Submitted Successfully',
      message: 'Your bid for "Medical Supply Procurement" has been submitted and is under review.',
      type: 'info',
      link: '/tenders/' + tender3.id,
      createdAt: pastDate(3),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor3.id,
      title: 'Documents Pending Review',
      message: 'Your submitted documents are pending admin review. Verification may take 2-3 business days.',
      type: 'warning',
      link: '/documents',
      createdAt: pastDate(2),
    },
  })

  await db.notification.create({
    data: {
      userId: contractor3.id,
      title: 'New Tender Available',
      message: 'A new tender "Medical Supply Procurement" matching your skills has been published.',
      type: 'info',
      link: '/tenders/' + tender3.id,
      createdAt: pastDate(7),
    },
  })

  // Tender Owner (Mengistu) notifications
  await db.notification.create({
    data: {
      userId: tenderOwner1.id,
      title: 'Tender Published Successfully',
      message: 'Your tender "Road Construction Project - Oromia Region" has been published and is now accepting bids.',
      type: 'success',
      link: '/tenders/' + tender4.id,
      createdAt: pastDate(5),
    },
  })

  await db.notification.create({
    data: {
      userId: tenderOwner1.id,
      title: 'New Bid Received',
      message: 'A new bid has been received for your tender "Road Construction Project - Oromia Region".',
      type: 'info',
      link: '/tenders/' + tender4.id,
      createdAt: pastDate(2),
    },
  })

  await db.notification.create({
    data: {
      userId: tenderOwner1.id,
      title: 'Seminar Completed',
      message: 'The "Tender Compliance & Documentation Seminar" has been completed. Thank you for your participation.',
      type: 'info',
      link: '/events/' + event3.id,
      createdAt: pastDate(10),
    },
  })

  console.log('  ✓ Created 16 notifications')

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n✅ Seeding complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  5 Users')
  console.log('  5 Profiles')
  console.log('  7 Documents')
  console.log('  6 Tenders')
  console.log('  9 Bids')
  console.log('  1 Project')
  console.log('  6 Tasks')
  console.log('  4 Milestones')
  console.log('  3 Payments')
  console.log('  1 Chat with 6 Messages')
  console.log('  3 Events with 5 Registrations')
  console.log('  16 Notifications')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await db.$disconnect()
    process.exit(1)
  })
