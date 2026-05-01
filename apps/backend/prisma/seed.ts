import { PrismaClient, Role, IssueType, Priority, ReportStatus, MessageRole, ConversationStatus, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding ResolveIQ database...\n');

  // ─── TENANT ────────────────────────────────────────────────
  console.log('Creating tenant: ShopEase...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'shopease' },
    update: {},
    create: {
      id: 'tenant_shopease',
      name: 'ShopEase',
      slug: 'shopease',
      ownerEmail: 'owner@shopease.com',
      supportEmail: 'support@shopease.com',
      primaryColor: '#6ee7b7',
      aiPersona: 'Aria, ShopEase support agent',
      aiSystemPrompt: `You are Aria, a support agent for ShopEase.
Help customers resolve their issues by asking clarifying questions one at a time.
Maximum 6 exchanges. Be empathetic and professional.
After gathering enough information, generate a structured report.`,
      plan: 'GROWTH',
      reportLimit: 5000,
    },
  });
  console.log(`  ✅ Tenant: ${tenant.name} (id: ${tenant.id})`);

  // ─── DEPARTMENTS ───────────────────────────────────────────
  console.log('\nCreating departments...');
  const deptData = [
    { name: 'Finance',      description: 'Handles refunds, payments, and billing disputes',    email: 'finance@shopease.com' },
    { name: 'Logistics',    description: 'Handles delivery issues, wrong items, and returns',  email: 'logistics@shopease.com' },
    { name: 'CustomerCare', description: 'Handles complaints, account issues, and general queries', email: 'care@shopease.com' },
    { name: 'HR',           description: 'Internal HR matters',                                email: 'hr@shopease.com' },
  ];

  const departments: Record<string, any> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: d.name } },
      update: {},
      create: { tenantId: tenant.id, ...d },
    });
    departments[d.name] = dept;
    console.log(`  ✅ Department: ${dept.name} (id: ${dept.id})`);
  }

  // ─── ROUTING RULES ─────────────────────────────────────────
  console.log('\nCreating routing rules...');
  const rules = [
    { issueType: IssueType.REFUND,       deptName: 'Finance',      priority: 10 },
    { issueType: IssueType.DATA_CHANGE,  deptName: 'CustomerCare', priority: 10 },
    { issueType: IssueType.COMPLAINT,    deptName: 'CustomerCare', priority: 10 },
    { issueType: IssueType.OTHER,        deptName: 'CustomerCare', priority: 5  },
  ];

  for (const r of rules) {
    await prisma.routingRule.upsert({
      where: { tenantId_issueType: { tenantId: tenant.id, issueType: r.issueType } },
      update: {},
      create: {
        tenantId: tenant.id,
        issueType: r.issueType,
        deptId: departments[r.deptName].id,
        priority: r.priority,
      },
    });
    console.log(`  ✅ Rule: ${r.issueType} → ${r.deptName}`);
  }

  // ─── USERS ─────────────────────────────────────────────────
  console.log('\nCreating users...');
  const hash = await bcrypt.hash('Test@1234', 10);

  const usersData = [
    {
      email: 'customer@shopease.com',
      name: 'Rahul Sharma',
      role: Role.CUSTOMER,
      deptId: null,
      phone: '+91 98765 43210',
    },
    {
      email: 'customer2@shopease.com',
      name: 'Priya Mehta',
      role: Role.CUSTOMER,
      deptId: null,
      phone: '+91 91234 56789',
    },
    {
      email: 'cda@shopease.com',
      name: 'Ananya Singh',
      role: Role.CDA,
      deptId: null,
      phone: '+91 99887 76655',
    },
    {
      email: 'finance@shopease.com',
      name: 'Vikram Joshi',
      role: Role.DEPT_ADMIN,
      deptId: departments['Finance'].id,
      phone: '+91 88776 65544',
    },
    {
      email: 'logistics@shopease.com',
      name: 'Sunita Patel',
      role: Role.DEPT_ADMIN,
      deptId: departments['Logistics'].id,
      phone: '+91 77665 54433',
    },
    {
      email: 'superadmin@shopease.com',
      name: 'Arjun Kapoor',
      role: Role.SUPER_ADMIN,
      deptId: null,
      phone: '+91 66554 43322',
    },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: u.role,
        tenantId: tenant.id,
        deptId: u.deptId,
        phone: u.phone,
        isActive: true,
      },
    });
    users[u.email] = user;
    console.log(`  ✅ User: ${u.name} (${u.role}) — ${u.email}`);
  }

  // ─── CONVERSATIONS + REPORTS ───────────────────────────────
  console.log('\nCreating dummy conversations and reports...');

  // ── Report 1: PENDING_CDA (fresh, waiting for CDA review) ──
  const conv1 = await prisma.conversation.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer@shopease.com'].id,
      status: ConversationStatus.SUBMITTED,
      turnCount: 5,
      modelUsed: 'claude-sonnet-4-20250514',
      totalTokens: 820,
      reportConfirmed: true,
    },
  });

  await prisma.message.createMany({
    data: [
      { conversationId: conv1.id, role: MessageRole.assistant, content: 'Hi! I\'m Aria, ShopEase support. How can I help you today?' },
      { conversationId: conv1.id, role: MessageRole.user,      content: 'I want a refund for Order #4521. The product arrived damaged.' },
      { conversationId: conv1.id, role: MessageRole.assistant, content: 'I\'m sorry to hear that. Can you describe what was damaged?' },
      { conversationId: conv1.id, role: MessageRole.user,      content: 'The screen was cracked. It was completely unusable when I opened the box.' },
      { conversationId: conv1.id, role: MessageRole.assistant, content: 'When did the order arrive? And what is the order value?', containsReport: false },
      { conversationId: conv1.id, role: MessageRole.user,      content: 'Arrived yesterday. I paid ₹2,400 for it.' },
      { conversationId: conv1.id, role: MessageRole.assistant, content: 'Thank you. I have enough information to create your report.', containsReport: true },
    ],
  });

  const report1 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer@shopease.com'].id,
      conversationId: conv1.id,
      issueType: IssueType.REFUND,
      issueSummary: 'Customer received Order #4521 with a cracked screen. Product was unusable on arrival. Customer paid ₹2,400.',
      actionRequested: 'Full refund of ₹2,400 for Order #4521',
      routeToDeptId: departments['Finance'].id,
      routeToDeptName: 'Finance',
      priority: Priority.MEDIUM,
      status: ReportStatus.PENDING_CDA,
      aiConfidence: 0.94,
      refundAmount: 240000, // in paise
      rawConversation: [],
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hrs from now
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report1.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        note: 'Report generated by AI from conversation',
        isSystemEntry: true,
      },
      {
        reportId: report1.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.PENDING_CDA,
        note: 'Customer confirmed report and submitted for review',
      },
    ],
  });

  console.log(`  ✅ Report 1: ${report1.id} — PENDING_CDA (Refund ₹2,400)`);

  // ── Report 2: APPROVED_TO_DEPT (CDA approved, dept working) ──
  const report2 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer2@shopease.com'].id,
      issueType: IssueType.COMPLAINT,
      issueSummary: 'Customer received wrong item (blue shoes instead of red) for Order #4490. Correct item never resent.',
      actionRequested: 'Reship correct item (Red Nike Air Max, Size 9) or issue full refund',
      routeToDeptId: departments['Logistics'].id,
      routeToDeptName: 'Logistics',
      priority: Priority.HIGH,
      status: ReportStatus.APPROVED_TO_DEPT,
      currentActorId: users['logistics@shopease.com'].id,
      currentActorRole: Role.DEPT_ADMIN,
      aiConfidence: 0.88,
      rawConversation: [],
      slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hrs (HIGH priority)
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report2.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        note: 'Report generated by AI',
        isSystemEntry: true,
      },
      {
        reportId: report2.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.PENDING_CDA,
        note: 'Customer submitted report',
      },
      {
        reportId: report2.id,
        actorId: users['cda@shopease.com'].id,
        actorRole: Role.CDA,
        fromStatus: ReportStatus.PENDING_CDA,
        toStatus: ReportStatus.APPROVED_TO_DEPT,
        note: 'Verified order details. Wrong item confirmed in warehouse log. Routing to Logistics.',
      },
    ],
  });

  console.log(`  ✅ Report 2: ${report2.id} — APPROVED_TO_DEPT (Wrong item)`);

  // ── Report 3: COMPLETED ──
  const report3 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer@shopease.com'].id,
      issueType: IssueType.DATA_CHANGE,
      issueSummary: 'Customer wants to update delivery address on account. Old address in Noida, new address in Vaishali, Ghaziabad.',
      actionRequested: 'Update default delivery address to: 42, Vaishali Sector 4, Ghaziabad - 201010',
      routeToDeptId: departments['CustomerCare'].id,
      routeToDeptName: 'CustomerCare',
      priority: Priority.LOW,
      status: ReportStatus.COMPLETED,
      aiConfidence: 0.97,
      rawConversation: [],
      resolution: 'Address updated successfully in the system. Customer notified via email.',
      slaDeadline: new Date(Date.now() - 12 * 60 * 60 * 1000), // past (completed)
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report3.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        isSystemEntry: true,
        note: 'Report generated by AI',
      },
      {
        reportId: report3.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.PENDING_CDA,
        note: 'Customer submitted report',
      },
      {
        reportId: report3.id,
        actorId: users['cda@shopease.com'].id,
        actorRole: Role.CDA,
        fromStatus: ReportStatus.PENDING_CDA,
        toStatus: ReportStatus.APPROVED_TO_DEPT,
        note: 'Standard address change. Approved and routed to CustomerCare.',
      },
      {
        reportId: report3.id,
        actorId: users['cda@shopease.com'].id,
        actorRole: Role.CDA,
        fromStatus: ReportStatus.APPROVED_TO_DEPT,
        toStatus: ReportStatus.IN_PROGRESS,
        note: 'CustomerCare team acknowledged the report',
        isSystemEntry: true,
      },
      {
        reportId: report3.id,
        actorId: users['cda@shopease.com'].id,
        actorRole: Role.DEPT_ADMIN,
        fromStatus: ReportStatus.IN_PROGRESS,
        toStatus: ReportStatus.COMPLETED,
        note: 'Address updated in the system.',
        actionTaken: 'Updated delivery address to: 42, Vaishali Sector 4, Ghaziabad - 201010',
      },
    ],
  });

  console.log(`  ✅ Report 3: ${report3.id} — COMPLETED (Address change)`);

  // ── Report 4: ESCALATED ──
  const report4 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer2@shopease.com'].id,
      issueType: IssueType.REFUND,
      issueSummary: 'Customer claims refund was approved 2 weeks ago but never credited to bank account. Amount: ₹5,800.',
      actionRequested: 'Investigate and process pending refund of ₹5,800 to original payment method',
      routeToDeptId: departments['Finance'].id,
      routeToDeptName: 'Finance',
      priority: Priority.HIGH,
      status: ReportStatus.ESCALATED,
      currentActorId: users['superadmin@shopease.com'].id,
      currentActorRole: Role.SUPER_ADMIN,
      aiConfidence: 0.91,
      rawConversation: [],
      refundAmount: 580000,
      escalationCount: 1,
      lastEscalatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      slaBreached: true,
      slaDeadline: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report4.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        isSystemEntry: true,
        note: 'Report generated by AI',
      },
      {
        reportId: report4.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.PENDING_CDA,
        note: 'Customer submitted report',
      },
      {
        reportId: report4.id,
        actorId: users['cda@shopease.com'].id,
        actorRole: Role.CDA,
        fromStatus: ReportStatus.PENDING_CDA,
        toStatus: ReportStatus.REJECTED,
        note: 'Refund already processed on our end. Bank delays are outside our scope.',
      },
      {
        reportId: report4.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.REJECTED,
        toStatus: ReportStatus.ESCALATED,
        note: 'I have bank statement showing no credit. This is unacceptable. Escalating.',
      },
    ],
  });

  await prisma.escalation.create({
    data: {
      reportId: report4.id,
      escalatedById: users['customer2@shopease.com'].id,
      escalationReason: 'Refund was approved but never received. Bank statement confirms no credit in 14 days. CDA rejection is incorrect.',
      level: 1,
    },
  });

  console.log(`  ✅ Report 4: ${report4.id} — ESCALATED (Missing refund ₹5,800)`);

  // ─── NOTIFICATIONS ──────────────────────────────────────────
  console.log('\nCreating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: users['customer@shopease.com'].id,
        reportId: report1.id,
        type: NotificationType.REPORT_SUBMITTED,
        title: 'Report submitted',
        message: `Your report ${report1.id} has been submitted and is pending review.`,
        read: true,
        readAt: new Date(),
        emailSent: true,
        actionUrl: `/report/${report1.id}`,
      },
      {
        userId: users['cda@shopease.com'].id,
        reportId: report1.id,
        type: NotificationType.NEW_REPORT_ASSIGNED,
        title: 'New report pending review',
        message: 'A new report requires your review: Refund request for Order #4521.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report1.id}`,
      },
      {
        userId: users['customer2@shopease.com'].id,
        reportId: report4.id,
        type: NotificationType.REPORT_ESCALATED,
        title: 'Escalation received',
        message: 'Your escalation has been received and is being reviewed by senior management.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report4.id}`,
      },
      {
        userId: users['superadmin@shopease.com'].id,
        reportId: report4.id,
        type: NotificationType.REPORT_ESCALATED,
        title: 'New escalation requires your attention',
        message: `Report ${report4.id} has been escalated. Missing refund of ₹5,800.`,
        read: false,
        emailSent: true,
        actionUrl: `/report/${report4.id}`,
      },
      {
        userId: users['logistics@shopease.com'].id,
        reportId: report2.id,
        type: NotificationType.NEW_REPORT_ASSIGNED,
        title: 'New report assigned to Logistics',
        message: 'Wrong item delivered for Order #4490. Action required.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report2.id}`,
      },
      {
        userId: users['finance@shopease.com'].id,
        reportId: report4.id,
        type: NotificationType.SLA_BREACHED,
        title: 'SLA breached',
        message: `Report ${report4.id} has breached its SLA deadline. Immediate action required.`,
        read: false,
        emailSent: true,
        actionUrl: `/report/${report4.id}`,
      },
    ],
  });

  console.log('  ✅ Notifications created');

  // ─── AUDIT LOGS ─────────────────────────────────────────────
  console.log('\nCreating audit logs...');

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        action: 'report.created',
        entityType: 'Report',
        entityId: report1.id,
        actorId: users['customer@shopease.com'].id,
        actorEmail: 'customer@shopease.com',
        actorRole: 'CUSTOMER',
        after: { status: 'PENDING_CDA', issueType: 'REFUND' },
        reportId: report1.id,
      },
      {
        tenantId: tenant.id,
        action: 'report.approved',
        entityType: 'Report',
        entityId: report2.id,
        actorId: users['cda@shopease.com'].id,
        actorEmail: 'cda@shopease.com',
        actorRole: 'CDA',
        before: { status: 'PENDING_CDA' },
        after: { status: 'APPROVED_TO_DEPT', routeToDept: 'Logistics' },
        reportId: report2.id,
      },
      {
        tenantId: tenant.id,
        action: 'report.escalated',
        entityType: 'Report',
        entityId: report4.id,
        actorId: users['customer2@shopease.com'].id,
        actorEmail: 'customer2@shopease.com',
        actorRole: 'CUSTOMER',
        before: { status: 'REJECTED' },
        after: { status: 'ESCALATED', escalationCount: 1 },
        reportId: report4.id,
      },
    ],
  });

  console.log('  ✅ Audit logs created');

  // ─── SUMMARY ────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('✅ SEED COMPLETE\n');
  console.log('Tenant:       ShopEase');
  console.log('Departments:  Finance, Logistics, CustomerCare, HR');
  console.log('Users:        6 (2 customers, 1 CDA, 2 dept admins, 1 super admin)');
  console.log('Reports:      4 (PENDING_CDA, APPROVED_TO_DEPT, COMPLETED, ESCALATED)');
  console.log('Notifications: 6');
  console.log('Audit Logs:   3');
  console.log('\nLogin credentials (all passwords: Test@1234):');
  console.log('  customer@shopease.com   → CUSTOMER');
  console.log('  customer2@shopease.com  → CUSTOMER');
  console.log('  cda@shopease.com        → CDA');
  console.log('  finance@shopease.com    → DEPT_ADMIN (Finance)');
  console.log('  logistics@shopease.com  → DEPT_ADMIN (Logistics)');
  console.log('  superadmin@shopease.com → SUPER_ADMIN');
  console.log('════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
