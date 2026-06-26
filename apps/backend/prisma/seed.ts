import {
  PrismaClient, Role, IssueType, Priority,
  ReportStatus, MessageRole, ConversationStatus,
  NotificationType
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding ResolveIQ E-commerce database...\n');

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
      aiSystemPrompt: `You are Aria, a returns and refund agent for ShopEase.
You already know the customer's order details — do not ask for them again.
Ask only for the reason for return. Maximum 3 exchanges.
Be empathetic, fast, and professional.
After getting the reason, generate a structured report immediately.`,
      plan: 'GROWTH',
      reportLimit: 5000,
      // Shopify (mock values for dev)
      shopifyStoreDomain: 'shopease-demo.myshopify.com',
      shopifyAccessToken: 'shpat_MOCK_TOKEN_FOR_DEV',
      // Razorpay (mock values for dev)
      razorpayKeyId: 'rzp_test_MOCK_KEY_ID',
      razorpayKeySecret: 'MOCK_KEY_SECRET',
    },
  });
  console.log(`  ✅ Tenant: ${tenant.name}`);

  // ─── RETURN POLICY ─────────────────────────────────────────
  console.log('\nCreating return policy...');
  await prisma.returnPolicy.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      returnWindowDays: 7,
      autoApproveBelow: 500000,        // auto approve refunds below ₹5,000
      autoApproveConfidence: 0.88,     // AI confidence threshold
      allowedReasons: [
        'damaged',
        'wrong_item',
        'not_delivered',
        'defective',
        'not_as_described',
      ],
      nonReturnableCategories: [
        'groceries',
        'innerwear',
        'personal_care',
      ],
    },
  });
  console.log('  ✅ Return policy created');

  // ─── DEPARTMENTS ───────────────────────────────────────────
  console.log('\nCreating departments...');
  const deptData = [
    {
      name: 'Finance',
      description: 'Handles refunds, payment reversals, billing disputes',
      email: 'finance@shopease.com',
    },
    {
      name: 'Logistics',
      description: 'Handles wrong items, not delivered, damaged in transit',
      email: 'logistics@shopease.com',
    },
    {
      name: 'CustomerCare',
      description: 'Handles complaints, general queries, account issues',
      email: 'care@shopease.com',
    },
    {
      name: 'HR',
      description: 'Internal HR matters only',
      email: 'hr@shopease.com',
    },
  ];

  const departments: Record<string, any> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: d.name } },
      update: {},
      create: { tenantId: tenant.id, ...d },
    });
    departments[d.name] = dept;
    console.log(`  ✅ ${dept.name}`);
  }

  // ─── ROUTING RULES ─────────────────────────────────────────
  console.log('\nCreating routing rules...');
  const rules = [
    { issueType: IssueType.REFUND,      deptName: 'Finance',      priority: 10 },
    { issueType: IssueType.DATA_CHANGE, deptName: 'CustomerCare', priority: 10 },
    { issueType: IssueType.COMPLAINT,   deptName: 'CustomerCare', priority: 10 },
    { issueType: IssueType.OTHER,       deptName: 'CustomerCare', priority: 5  },
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
    console.log(`  ✅ ${r.issueType} → ${r.deptName}`);
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
    console.log(`  ✅ ${u.name} (${u.role})`);
  }

  // ─── CACHED SHOPIFY ORDERS ─────────────────────────────────
  console.log('\nCreating cached Shopify orders (mock)...');

  const orders = [
    {
      shopifyOrderId: 'shopify_order_4521',
      orderNumber: '#4521',
      customerEmail: 'customer@shopease.com',
      customerName: 'Rahul Sharma',
      totalAmount: 240000,           // ₹2,400 in paise
      lineItems: [
        { title: 'Wireless Headphones Pro', quantity: 1,
          price: 240000, vendor: 'SoundMax' },
      ],
      fulfillmentStatus: 'fulfilled',
      financialStatus: 'paid',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      shopifyOrderId: 'shopify_order_4490',
      orderNumber: '#4490',
      customerEmail: 'customer2@shopease.com',
      customerName: 'Priya Mehta',
      totalAmount: 189900,           // ₹1,899
      lineItems: [
        { title: 'Nike Air Max (Red, Size 9)', quantity: 1,
          price: 189900, vendor: 'Nike' },
      ],
      fulfillmentStatus: 'fulfilled',
      financialStatus: 'paid',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    {
      shopifyOrderId: 'shopify_order_4388',
      orderNumber: '#4388',
      customerEmail: 'customer@shopease.com',
      customerName: 'Rahul Sharma',
      totalAmount: 580000,           // ₹5,800 — above auto-approve limit
      lineItems: [
        { title: 'Samsung Galaxy Buds Pro', quantity: 1,
          price: 580000, vendor: 'Samsung' },
      ],
      fulfillmentStatus: 'fulfilled',
      financialStatus: 'paid',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    },
    {
      shopifyOrderId: 'shopify_order_4601',
      orderNumber: '#4601',
      customerEmail: 'customer2@shopease.com',
      customerName: 'Priya Mehta',
      totalAmount: 99900,            // ₹999 — small order
      lineItems: [
        { title: 'Laptop Stand (Aluminium)', quantity: 1,
          price: 99900, vendor: 'TechGear' },
      ],
      fulfillmentStatus: 'fulfilled',
      financialStatus: 'paid',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
    },
  ];

  const cachedOrders: Record<string, any> = {};
  for (const o of orders) {
    const order = await prisma.cachedOrder.upsert({
      where: { tenantId_shopifyOrderId: {
        tenantId: tenant.id,
        shopifyOrderId: o.shopifyOrderId,
      }},
      update: {},
      create: { tenantId: tenant.id, ...o },
    });
    cachedOrders[o.orderNumber] = order;
    console.log(`  ✅ Order ${o.orderNumber} — ₹${o.totalAmount / 100}`);
  }

  // ─── REPORTS ───────────────────────────────────────────────
  console.log('\nCreating dummy reports...');

  // ── Report 1: AUTO_RESOLVED (AI handled, refund done) ──────
  const report1 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer@shopease.com'].id,
      issueType: IssueType.REFUND,
      issueSummary: 'Order #4601 — Laptop stand arrived with broken hinge. Item unusable. Ordered yesterday.',
      actionRequested: 'Full refund of ₹999 for Order #4601',
      routeToDeptId: departments['Finance'].id,
      routeToDeptName: 'Finance',
      priority: Priority.LOW,
      status: ReportStatus.AUTO_RESOLVED,
      aiConfidence: 0.96,
      refundAmount: 99900,
      shopifyOrderId: 'shopify_order_4601',
      shopifyOrderNumber: '#4601',
      autoResolved: true,
      autoResolveReason: 'Within return window (1 day), valid reason (damaged), confidence 96%, refund below auto-approve limit (₹5,000)',
      refundInitiated: true,
      refundInitiatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      razorpayRefundId: 'rfnd_MOCK_' + Date.now(),
      rawConversation: [
        { role: 'assistant', content: 'Hi Priya! I can see your order #4601 for ₹999 placed yesterday. What seems to be the issue?' },
        { role: 'user', content: 'The laptop stand arrived with a broken hinge. It\'s completely unusable.' },
        { role: 'assistant', content: 'I\'m sorry to hear that. Since this is a damaged item within our 7-day return window, you\'re eligible for a full refund. Let me process that for you.' },
      ],
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report1.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        note: 'Report generated by AI from 2-turn conversation',
        isSystemEntry: true,
      },
      {
        reportId: report1.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.AUTO_RESOLVED,
        note: 'Auto-resolved by AI. Confidence: 96%. Within return window. Damage claim verified.',
        isSystemEntry: true,
        actionTaken: 'Refund of ₹999 initiated via Razorpay',
      },
    ],
  });
  console.log(`  ✅ Report 1: AUTO_RESOLVED — ₹999 refund (Laptop Stand)`);

  // ── Report 2: PENDING_CDA (needs human review) ─────────────
  const report2 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer@shopease.com'].id,
      issueType: IssueType.REFUND,
      issueSummary: 'Order #4521 — Wireless Headphones arrived with cracked screen. Item unusable. Order 3 days old.',
      actionRequested: 'Full refund of ₹2,400 for Order #4521',
      routeToDeptId: departments['Finance'].id,
      routeToDeptName: 'Finance',
      priority: Priority.MEDIUM,
      status: ReportStatus.PENDING_CDA,
      aiConfidence: 0.82,            // below 0.88 threshold → manual review
      refundAmount: 240000,
      shopifyOrderId: 'shopify_order_4521',
      shopifyOrderNumber: '#4521',
      autoResolved: false,
      autoResolveReason: null,
      rawConversation: [
        { role: 'assistant', content: 'Hi Rahul! I see your order #4521 — Wireless Headphones Pro for ₹2,400, placed 3 days ago. What\'s the issue?' },
        { role: 'user', content: 'The screen was cracked when I opened the box.' },
        { role: 'assistant', content: 'Was the outer packaging also damaged when it arrived?' },
        { role: 'user', content: 'No the box was fine, only the product was damaged inside.' },
      ],
      slaDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000),
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report2.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        note: 'AI confidence 82% — below threshold. Sent to manual review.',
        isSystemEntry: true,
      },
      {
        reportId: report2.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.PENDING_CDA,
        note: 'Customer confirmed report and submitted for review',
      },
    ],
  });
  console.log(`  ✅ Report 2: PENDING_CDA — ₹2,400 refund (Headphones)`);

  // ── Report 3: APPROVED_TO_DEPT (wrong item, logistics) ─────
  const report3 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer2@shopease.com'].id,
      issueType: IssueType.COMPLAINT,
      issueSummary: 'Order #4490 — Received blue Nike shoes instead of red. Size also wrong (got Size 8, ordered Size 9).',
      actionRequested: 'Reship correct item: Red Nike Air Max Size 9, or issue full refund of ₹1,899',
      routeToDeptId: departments['Logistics'].id,
      routeToDeptName: 'Logistics',
      priority: Priority.HIGH,
      status: ReportStatus.APPROVED_TO_DEPT,
      currentActorId: users['logistics@shopease.com'].id,
      currentActorRole: Role.DEPT_ADMIN,
      aiConfidence: 0.91,
      refundAmount: 189900,
      shopifyOrderId: 'shopify_order_4490',
      shopifyOrderNumber: '#4490',
      autoResolved: false,
      rawConversation: [
        { role: 'assistant', content: 'Hi Priya! I see your order #4490 — Nike Air Max (Red, Size 9) for ₹1,899. What\'s the issue?' },
        { role: 'user', content: 'I received completely wrong shoes. Blue color and Size 8 instead of Red Size 9.' },
        { role: 'assistant', content: 'That\'s clearly a wrong item. This needs our logistics team to arrange a reship or refund.' },
      ],
      slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report3.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        note: 'Wrong item complaint. Confidence 91% but wrong_item requires manual logistics action.',
        isSystemEntry: true,
      },
      {
        reportId: report3.id,
        actorId: users['customer2@shopease.com'].id,
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
        note: 'Wrong item confirmed against warehouse dispatch log. Routing to Logistics for reship.',
      },
    ],
  });
  console.log(`  ✅ Report 3: APPROVED_TO_DEPT — ₹1,899 (Wrong shoes)`);

  // ── Report 4: ESCALATED (outside return window, disputed) ──
  const report4 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer@shopease.com'].id,
      issueType: IssueType.REFUND,
      issueSummary: 'Order #4388 — Samsung Galaxy Buds Pro stopped working after 12 days. Outside 7-day return window. Customer claims manufacturing defect.',
      actionRequested: 'Refund or replacement for defective Samsung Galaxy Buds Pro ₹5,800',
      routeToDeptId: departments['Finance'].id,
      routeToDeptName: 'Finance',
      priority: Priority.HIGH,
      status: ReportStatus.ESCALATED,
      currentActorId: users['superadmin@shopease.com'].id,
      currentActorRole: Role.SUPER_ADMIN,
      aiConfidence: 0.73,
      refundAmount: 580000,          // ₹5,800 — above auto-approve limit anyway
      shopifyOrderId: 'shopify_order_4388',
      shopifyOrderNumber: '#4388',
      autoResolved: false,
      slaBreached: true,
      slaDeadline: new Date(Date.now() - 4 * 60 * 60 * 1000),
      escalationCount: 1,
      lastEscalatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      rawConversation: [
        { role: 'assistant', content: 'Hi Rahul! I see order #4388 — Samsung Galaxy Buds Pro for ₹5,800. What\'s the issue?' },
        { role: 'user', content: 'They stopped working after 12 days. Complete manufacturing defect.' },
        { role: 'assistant', content: 'I understand your frustration. However, this is outside our 7-day return window. I\'ll flag this for manual review given the defect claim.' },
      ],
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report4.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        note: 'Outside return window. Confidence 73%. Sent to manual review.',
        isSystemEntry: true,
      },
      {
        reportId: report4.id,
        actorId: users['customer@shopease.com'].id,
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
        note: 'Order is 14 days old, outside our 7-day return window. Policy does not cover this.',
      },
      {
        reportId: report4.id,
        actorId: users['customer@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.REJECTED,
        toStatus: ReportStatus.ESCALATED,
        note: 'This is a manufacturing defect not a change-of-mind return. Escalating.',
      },
    ],
  });

  await prisma.escalation.create({
    data: {
      reportId: report4.id,
      escalatedById: users['customer@shopease.com'].id,
      escalationReason: 'Product failed after 12 days due to manufacturing defect. This is covered under consumer protection laws regardless of return window. I have video proof.',
      level: 1,
    },
  });
  console.log(`  ✅ Report 4: ESCALATED — ₹5,800 (Defective Buds)`);

  // ── Report 5: COMPLETED (full happy path example) ──────────
  const report5 = await prisma.report.create({
    data: {
      tenantId: tenant.id,
      customerId: users['customer2@shopease.com'].id,
      issueType: IssueType.REFUND,
      issueSummary: 'Order #4388 clone — Defective phone case. Cracked on first use.',
      actionRequested: 'Refund ₹499',
      routeToDeptId: departments['Finance'].id,
      routeToDeptName: 'Finance',
      priority: Priority.LOW,
      status: ReportStatus.COMPLETED,
      aiConfidence: 0.95,
      refundAmount: 49900,
      autoResolved: false,
      resolution: 'Refund of ₹499 processed via Razorpay. Reference: rfnd_MOCK_COMPLETED',
      rawConversation: [],
      slaDeadline: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
  });

  await prisma.timelineEntry.createMany({
    data: [
      {
        reportId: report5.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: null,
        toStatus: ReportStatus.DRAFT,
        isSystemEntry: true,
        note: 'AI generated report',
      },
      {
        reportId: report5.id,
        actorId: users['customer2@shopease.com'].id,
        actorRole: Role.CUSTOMER,
        fromStatus: ReportStatus.DRAFT,
        toStatus: ReportStatus.PENDING_CDA,
        note: 'Customer submitted',
      },
      {
        reportId: report5.id,
        actorId: users['cda@shopease.com'].id,
        actorRole: Role.CDA,
        fromStatus: ReportStatus.PENDING_CDA,
        toStatus: ReportStatus.APPROVED_TO_DEPT,
        note: 'Valid defect claim within return window. Approved.',
      },
      {
        reportId: report5.id,
        actorId: users['finance@shopease.com'].id,
        actorRole: Role.DEPT_ADMIN,
        fromStatus: ReportStatus.APPROVED_TO_DEPT,
        toStatus: ReportStatus.COMPLETED,
        note: 'Refund processed',
        actionTaken: 'Refund of ₹499 initiated via Razorpay. Ref: rfnd_MOCK_COMPLETED. Customer will receive in 5-7 days.',
      },
    ],
  });
  console.log(`  ✅ Report 5: COMPLETED — ₹499 (Full happy path)`);

  // ─── NOTIFICATIONS ──────────────────────────────────────────
  console.log('\nCreating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: users['customer2@shopease.com'].id,
        reportId: report1.id,
        type: NotificationType.AUTO_REFUND_PROCESSED,
        title: '✅ Refund of ₹999 initiated!',
        message: 'Your return for order #4601 was automatically approved. Refund of ₹999 initiated. Arrives in 5-7 business days.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report1.id}`,
      },
      {
        userId: users['cda@shopease.com'].id,
        reportId: report2.id,
        type: NotificationType.NEW_REPORT_ASSIGNED,
        title: 'New return request needs review',
        message: 'Rahul Sharma — Refund ₹2,400 for damaged Wireless Headphones (Order #4521). AI confidence: 82%.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report2.id}`,
      },
      {
        userId: users['logistics@shopease.com'].id,
        reportId: report3.id,
        type: NotificationType.NEW_REPORT_ASSIGNED,
        title: 'Wrong item — action required',
        message: 'Priya Mehta received wrong Nike shoes (Order #4490). Reship or refund ₹1,899. HIGH priority.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report3.id}`,
      },
      {
        userId: users['superadmin@shopease.com'].id,
        reportId: report4.id,
        type: NotificationType.REPORT_ESCALATED,
        title: '🔺 Escalation: Defective Samsung Buds ₹5,800',
        message: 'Rahul Sharma escalated rejection. Claims manufacturing defect on Galaxy Buds Pro after 12 days. SLA breached.',
        read: false,
        emailSent: true,
        actionUrl: `/report/${report4.id}`,
      },
      {
        userId: users['customer@shopease.com'].id,
        reportId: report4.id,
        type: NotificationType.REPORT_ESCALATED,
        title: 'Escalation received',
        message: 'Your escalation for order #4388 has been received and is with senior management.',
        read: true,
        readAt: new Date(),
        emailSent: true,
        actionUrl: `/report/${report4.id}`,
      },
      {
        userId: users['customer2@shopease.com'].id,
        reportId: report5.id,
        type: NotificationType.REPORT_COMPLETED,
        title: 'Return resolved ✅',
        message: 'Your refund of ₹499 has been processed. You\'ll receive it in 5-7 business days.',
        read: true,
        readAt: new Date(),
        emailSent: true,
        actionUrl: `/report/${report5.id}`,
      },
    ],
  });
  console.log('  ✅ 6 notifications created');

  // ─── AUDIT LOGS ─────────────────────────────────────────────
  console.log('\nCreating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        action: 'report.auto_resolved',
        entityType: 'Report',
        entityId: report1.id,
        actorEmail: 'system@resolveiq.app',
        actorRole: 'SYSTEM',
        before: { status: 'DRAFT' },
        after: { status: 'AUTO_RESOLVED', refundInitiated: true,
                 razorpayRefundId: 'rfnd_MOCK_' + Date.now() },
        reportId: report1.id,
      },
      {
        tenantId: tenant.id,
        action: 'report.created',
        entityType: 'Report',
        entityId: report2.id,
        actorId: users['customer@shopease.com'].id,
        actorEmail: 'customer@shopease.com',
        actorRole: 'CUSTOMER',
        after: { status: 'PENDING_CDA', aiConfidence: 0.82 },
        reportId: report2.id,
      },
      {
        tenantId: tenant.id,
        action: 'report.approved',
        entityType: 'Report',
        entityId: report3.id,
        actorId: users['cda@shopease.com'].id,
        actorEmail: 'cda@shopease.com',
        actorRole: 'CDA',
        before: { status: 'PENDING_CDA' },
        after: { status: 'APPROVED_TO_DEPT', routeToDept: 'Logistics' },
        reportId: report3.id,
      },
      {
        tenantId: tenant.id,
        action: 'report.escalated',
        entityType: 'Report',
        entityId: report4.id,
        actorId: users['customer@shopease.com'].id,
        actorEmail: 'customer@shopease.com',
        actorRole: 'CUSTOMER',
        before: { status: 'REJECTED' },
        after: { status: 'ESCALATED', escalationCount: 1 },
        reportId: report4.id,
      },
    ],
  });
  console.log('  ✅ 4 audit logs created');

  // ─── SUMMARY ────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETE — ResolveIQ E-commerce\n');
  console.log('Tenant:        ShopEase (Shopify + Razorpay mock)');
  console.log('Return Policy: 7 days, auto-approve below ₹5,000');
  console.log('Departments:   Finance, Logistics, CustomerCare, HR');
  console.log('Cached Orders: 4 mock Shopify orders');
  console.log('Users:         6');
  console.log('Reports:       5 across all statuses');
  console.log('               AUTO_RESOLVED → ₹999  (Laptop Stand)');
  console.log('               PENDING_CDA   → ₹2,400 (Headphones)');
  console.log('               APPROVED_DEPT → ₹1,899 (Wrong shoes)');
  console.log('               ESCALATED     → ₹5,800 (Buds defect)');
  console.log('               COMPLETED     → ₹499  (Phone case)');
  console.log('Notifications: 6');
  console.log('Audit Logs:    4');
  console.log('\nLogins (all passwords: Test@1234):');
  console.log('  customer@shopease.com    → CUSTOMER (Rahul)');
  console.log('  customer2@shopease.com   → CUSTOMER (Priya)');
  console.log('  cda@shopease.com         → CDA');
  console.log('  finance@shopease.com     → DEPT_ADMIN Finance');
  console.log('  logistics@shopease.com   → DEPT_ADMIN Logistics');
  console.log('  superadmin@shopease.com  → SUPER_ADMIN');
  console.log('\nMock flags for .env:');
  console.log('  SHOPIFY_MOCK=true');
  console.log('  RAZORPAY_MOCK=true');
  console.log('════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
