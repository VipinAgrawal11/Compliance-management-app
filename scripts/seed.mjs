/**
 * Seed script — Audit Firm Compliance & Engagement Management System.
 *
 * Usage:
 *   1) Run supabase/schema.sql then supabase/policies.sql in the SQL editor.
 *   2) Set environment variables (NEVER commit the service role key):
 *        SUPABASE_URL=https://<ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<service_role key from Project Settings -> API>
 *   3) node scripts/seed.mjs
 *
 * The service role key bypasses RLS, which is exactly what a trusted seed needs.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_PASSWORD = 'AuditFirm@2026';

const STAFF = [
  { email: 'partner1@auditfirm.test', name: 'Anita Sharma', role: 'partner', designation: 'Senior Partner' },
  { email: 'partner2@auditfirm.test', name: 'Rajen Thapa', role: 'partner', designation: 'Partner' },
  { email: 'employee1@auditfirm.test', name: 'Sita Gurung', role: 'employee', designation: 'Audit Manager' },
  { email: 'employee2@auditfirm.test', name: 'Bikash Karki', role: 'employee', designation: 'Senior Associate' },
  { email: 'employee3@auditfirm.test', name: 'Pooja Shrestha', role: 'employee', designation: 'Audit Associate' },
  { email: 'employee4@auditfirm.test', name: 'Nabin Adhikari', role: 'employee', designation: 'Audit Associate' },
  { email: 'employee5@auditfirm.test', name: 'Kriti Maharjan', role: 'employee', designation: 'Article Assistant' },
];

async function ensureUser({ email, name, role, designation }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name, role, designation },
  });
  if (!error) {
    console.log(`  created ${email} (${role})`);
    return data.user.id;
  }
  // Already exists — find and align profile.
  let page = 1;
  for (;;) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw listErr;
    const found = list.users.find((u) => u.email === email);
    if (found) {
      console.log(`  exists  ${email} (${role})`);
      await admin.from('users').update({ name, role, designation, active: true }).eq('id', found.id);
      return found.id;
    }
    if (list.users.length < 200) break;
    page += 1;
  }
  throw new Error(`Could not create or find user ${email}: ${error.message}`);
}

const day = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const pick = (arr, i) => arr[i % arr.length];

async function main() {
  console.log('1/8  Staff accounts…');
  const ids = {};
  for (const person of STAFF) ids[person.email] = await ensureUser(person);
  const partners = [ids['partner1@auditfirm.test'], ids['partner2@auditfirm.test']];
  const employees = [
    ids['employee1@auditfirm.test'],
    ids['employee2@auditfirm.test'],
    ids['employee3@auditfirm.test'],
    ids['employee4@auditfirm.test'],
    ids['employee5@auditfirm.test'],
  ];

  console.log('2/8  Firm settings…');
  await admin.from('app_settings').update({ firm_name: 'Sharma Thapa & Associates' }).eq('id', 1);

  console.log('3/8  Checklist templates…');
  await admin.from('checklist_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const templateDefs = [
    {
      name: 'Statutory Audit — Standard',
      audit_type: 'Statutory Audit',
      items: [
        'Engagement letter signed',
        'Trial balance obtained',
        'Bank confirmations sent',
        'Revenue cut-off testing',
        'Fixed assets verification',
        'Tax computation review',
        'Draft financial statements',
        'Partner review & sign-off',
      ],
    },
    {
      name: 'Internal Audit — Controls',
      audit_type: 'Internal Audit',
      items: [
        'Process walkthroughs',
        'Control matrix prepared',
        'Sample testing of controls',
        'Findings & recommendations',
        'Management response obtained',
      ],
    },
  ];
  for (const t of templateDefs) {
    const { data: tpl } = await admin
      .from('checklist_templates')
      .insert({ name: t.name, audit_type: t.audit_type })
      .select('id')
      .single();
    await admin
      .from('checklist_items')
      .insert(t.items.map((item_name, i) => ({ template_id: tpl.id, item_name, sort_order: i })));
  }

  console.log('4/8  Clients…');
  await admin.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const entityTypes = ['Pvt Ltd', 'Public Ltd', 'Partnership', 'Proprietorship', 'NGO'];
  const industries = ['Manufacturing', 'Trading', 'Service'];
  const clientNames = [
    'Himalayan Foods Pvt Ltd',
    'Everest Trading Co.',
    'Kathmandu Textiles Ltd',
    'Annapurna Hydropower Public Ltd',
    'Lumbini Hospitality Pvt Ltd',
    'Sagarmatha Logistics',
    'Pokhara Tourism Services',
    'Janaki Agro Industries',
    'Newa Handicrafts',
    'Bagmati Development NGO',
  ];
  const allServices = ['Audit', 'Accounting', 'Internal Audit', 'Advisory', 'DDA', 'Others'];
  const clientRows = clientNames.map((client_name, i) => ({
    client_name,
    entity_type: pick(entityTypes, i),
    industry: pick(industries, i),
    registration_details: `Reg. No. ${10000 + i}`,
    tax_type: i % 2 === 0 ? 'VAT' : 'PAN',
    tax_number: `${600000000 + i * 137}`,
    location: pick(['Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'Bhaktapur'], i),
    contact_person: pick(['Hari', 'Gita', 'Suresh', 'Maya', 'Ram'], i) + ' ' + pick(['Lama', 'Rai', 'Magar'], i),
    contact_number: `98${String(10000000 + i * 11111).slice(0, 8)}`,
    services: [allServices[i % 4], allServices[(i + 1) % 4]],
    other_service: '',
    history_notes: 'Long-standing client. Files maintained from FY 2079/80.',
    created_by: partners[i % 2],
  }));
  const { data: clients, error: cErr } = await admin.from('clients').insert(clientRows).select('id, client_name');
  if (cErr) throw cErr;
  console.log(`  inserted ${clients.length} clients`);

  console.log('5/8  Compliances…');
  const complianceDefs = [
    { category: 'TAX', subcategory: 'VAT Returns', offset: -5 },
    { category: 'TAX', subcategory: 'Income Tax Returns', offset: 20 },
    { category: 'TAX', subcategory: 'TDS', offset: 7 },
    { category: 'TAX', subcategory: 'Advance Tax', offset: 45 },
    { category: 'CORPORATE', subcategory: 'OCR Annual Documents', offset: -2 },
    { category: 'CORPORATE', subcategory: 'Banijya Renewal', offset: 15 },
    { category: 'CORPORATE', subcategory: 'DOI Renewal', offset: 60 },
    { category: 'AUDIT', subcategory: 'Statutory Audit', offset: 30 },
  ];
  const complianceRows = [];
  clients.forEach((cl, idx) => {
    for (let k = 0; k < 3; k++) {
      const def = complianceDefs[(idx + k) % complianceDefs.length];
      const offset = def.offset + (k - 1) * 3;
      complianceRows.push({
        client_id: cl.id,
        category: def.category,
        subcategory: def.subcategory,
        due_date: day(offset),
        status: offset < -3 ? 'Pending' : k === 2 ? 'Completed' : 'Pending',
        remarks: '',
        created_by: partners[idx % 2],
      });
    }
  });
  const { data: compliances, error: compErr } = await admin
    .from('compliances')
    .insert(complianceRows)
    .select('id, client_id');
  if (compErr) throw compErr;
  console.log(`  inserted ${compliances.length} compliances`);

  console.log('6/8  Engagements…');
  const stages = ['Planning', 'Field Work', 'Review', 'Documents Requested', 'Partner Approval'];
  const auditTypes = ['Statutory Audit', 'Internal Audit', 'Other Audit'];
  const engagementRows = clients.slice(0, 7).map((cl, i) => ({
    client_id: cl.id,
    audit_type: pick(auditTypes, i),
    stage: pick(stages, i),
    assigned_employee: pick(employees, i),
    start_date: day(-30 + i * 3),
    deadline: day(20 + i * 5),
    delay_reason: i === 2 ? 'Awaiting bank confirmations from client' : '',
    created_by: partners[i % 2],
  }));
  const { data: engagements, error: eErr } = await admin
    .from('audit_engagements')
    .insert(engagementRows)
    .select('id, client_id, assigned_employee');
  if (eErr) throw eErr;
  console.log(`  inserted ${engagements.length} engagements`);

  console.log('7/8  Assignments (multi-employee)…');
  const assignmentRows = [];
  compliances.forEach((c, i) => {
    assignmentRows.push({ reference_type: 'compliance', reference_id: c.id, employee_id: pick(employees, i), status: 'Pending' });
    if (i % 3 === 0)
      assignmentRows.push({ reference_type: 'compliance', reference_id: c.id, employee_id: pick(employees, i + 1), status: 'Pending' });
  });
  engagements.forEach((e, i) => {
    assignmentRows.push({ reference_type: 'engagement', reference_id: e.id, employee_id: e.assigned_employee, status: 'Pending' });
    assignmentRows.push({ reference_type: 'engagement', reference_id: e.id, employee_id: pick(employees, i + 2), status: i % 2 === 0 ? 'Completed' : 'Pending', completed_date: i % 2 === 0 ? day(-1) : null });
  });
  await admin.from('assignments').upsert(assignmentRows, {
    onConflict: 'reference_type,reference_id,employee_id',
    ignoreDuplicates: true,
  });
  console.log(`  inserted ~${assignmentRows.length} assignments`);

  console.log('8/8  Documents, checklist progress & communications…');
  const docNames = ['Bank statements', 'Sales register', 'Purchase invoices', 'Fixed asset register', 'TDS certificates'];
  const docStatuses = ['Requested', 'Received', 'Pending', 'Not Applicable'];
  const docRows = [];
  engagements.forEach((e, i) => {
    for (let k = 0; k < 2; k++) {
      docRows.push({
        client_id: e.client_id,
        audit_id: e.id,
        document_name: pick(docNames, i + k),
        requested_date: day(-10 + i),
        deadline: day(5 + k * 4),
        status: pick(docStatuses, i + k),
        remarks: '',
      });
    }
  });
  await admin.from('documents').insert(docRows);

  const { data: stdTpl } = await admin
    .from('checklist_templates')
    .select('id')
    .eq('name', 'Statutory Audit — Standard')
    .single();
  if (stdTpl) {
    const { data: stdItems } = await admin
      .from('checklist_items')
      .select('item_name')
      .eq('template_id', stdTpl.id)
      .order('sort_order');
    for (const e of engagements.slice(0, 2)) {
      await admin.from('audit_checklist_progress').insert(
        (stdItems ?? []).map((it, i) => ({
          engagement_id: e.id,
          item_name: it.item_name,
          assigned_employee: e.assigned_employee,
          status: i < 3 ? 'Completed' : 'Pending',
        })),
      );
    }
  }

  const commTypes = ['Meeting', 'Call', 'Email', 'Other'];
  const commRows = [];
  clients.slice(0, 6).forEach((cl, i) => {
    commRows.push({
      client_id: cl.id,
      date: day(-7 + i),
      type: pick(commTypes, i),
      discussion_notes: 'Discussed audit timeline and pending documents.',
      decision_taken: 'Client to provide bank statements by next week.',
      next_action: 'Follow up on document submission.',
      responsible_person: pick(employees, i),
      created_by: partners[i % 2],
    });
  });
  await admin.from('communication_logs').insert(commRows);

  console.log('\nDone ✅  Sample logins (password for all): ' + DEFAULT_PASSWORD);
  for (const s of STAFF) console.log(`  ${s.role.padEnd(8)} ${s.email}`);
}

main().catch((e) => {
  console.error('\nSeed failed:', e.message);
  process.exit(1);
});
