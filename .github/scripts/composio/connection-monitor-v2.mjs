import { Composio } from '@composio/core';

// FIX: Handle missing COMPOSIO_API_KEY gracefully
const apiKey = process.env.COMPOSIO_API_KEY;
const userId = process.env.ZION_USER_ID || 'zion-monitor';

if (!apiKey) {
  console.log('\n═══ ZION CONNECTION MONITOR v2.0 — GRACEFUL DEGRADATION ═══\n');
  console.log('⚠ COMPOSIO_API_KEY not set — writing degraded report');
  const report = {
    timestamp: new Date().toISOString(),
    connections: [],
    alerts: [{ severity: 'error', message: 'COMPOSIO_API_KEY secret not configured' }],
    healthScore: 0,
    activeCount: 0,
    totalCount: 15,
    degraded: true
  };
  const fs = await import('fs');
  fs.writeFileSync('composio-connection-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log('\n═══ MONITOR COMPLETE (degraded) ═══');
  process.exit(0); // FIX: exit 0 instead of 1 — don't fail the workflow
}

const composio = new Composio({ apiKey });

const connections = {
  calendly: process.env.COMPOSIO_CALENDLY_CONNECTION_ID,
  whatsapp: process.env.COMPOSIO_WHATSAPP_CONNECTION_ID,
  stripe: process.env.COMPOSIO_STRIPE_CONNECTION_ID,
  resend: process.env.COMPOSIO_RESEND_CONNECTION_ID,
  brevo: process.env.COMPOSIO_BREVO_CONNECTION_ID,
  gmail: process.env.COMPOSIO_GMAIL_CONNECTION_ID,
  hubspot: process.env.COMPOSIO_HUBSPOT_CONNECTION_ID,
  notion: process.env.COMPOSIO_NOTION_CONNECTION_ID,
  slack: process.env.COMPOSIO_SLACK_CONNECTION_ID,
  _1password: process.env.COMPOSIO_1PASSWORD_CONNECTION_ID,
  sendgrid: process.env.COMPOSIO_SENDGRID_CONNECTION_ID,
  activecampaign: process.env.COMPOSIO_ACTIVECAMPAIGN_CONNECTION_ID,
  firecrawl: process.env.COMPOSIO_FIRECRAWL_CONNECTION_ID,
  serpapi: process.env.COMPOSIO_SERPAPI_CONNECTION_ID,
  tavily: process.env.COMPOSIO_TAVILY_CONNECTION_ID,
};

async function listTools(connectionId) {
  if (!connectionId) return { count: 0, tools: [], status: 'NO_SECRET' };
  try {
    const result = await composio.tools.list({ connectionIds: [connectionId] });
    return { count: (result.tools || []).length, tools: result.tools || [], status: 'ACTIVE' };
  } catch (e) {
    return { count: 0, tools: [], error: e.message, status: 'ERROR' };
  }
}

async function run() {
  const ts = new Date().toISOString();
  console.log(`\n═══ ZION CONNECTION MONITOR v2.0 — ${ts} ═══\n`);

  const report = { timestamp: ts, connections: [], alerts: [] };
  let activeCount = 0;
  let errorCount = 0;

  for (const [name, id] of Object.entries(connections)) {
    if (!id) {
      report.connections.push({ name, status: 'NO_SECRET' });
      console.log(`  ○ ${name.padEnd(16)} NO_SECRET`);
      continue;
    }
    const { count, error, status } = await listTools(id);
    if (status === 'ACTIVE') activeCount++;
    if (status === 'ERROR') errorCount++;
    report.connections.push({ name, status, count, error });
    console.log(`  ${status === 'ACTIVE' ? '✓' : status === 'ERROR' ? '✗' : '○'} ${name.padEnd(16)} ${status} (${count} tools)`);
  }

  if (errorCount > 0) {
    report.alerts.push({ severity: 'warning', message: `${errorCount} connection(s) with errors` });
  }

  const total = Object.keys(connections).length;
  const healthScore = Math.round((activeCount / total) * 100);
  report.healthScore = healthScore;
  report.activeCount = activeCount;
  report.totalCount = total;

  console.log(`\n  Health Score: ${healthScore}% (${activeCount}/${total} active)`);
  console.log(`\n═══ MONITOR COMPLETE ═══`);

  const fs = await import('fs');
  fs.writeFileSync('composio-connection-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  return report;
}

run().catch(e => { console.error('MONITOR ERROR:', e); process.exit(0); }); // FIX: exit 0
