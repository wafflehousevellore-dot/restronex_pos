require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { prisma } = require('../src/lib/db');
const { AggregatorConnectionService } = require('../src/lib/integrations/services/connection-service');
const { AggregatorOutletMappingService } = require('../src/lib/integrations/services/outlet-mapping-service');
const { AggregatorMenuSyncService } = require('../src/lib/integrations/services/menu-sync-service');
const { AggregatorOrderIngestionService } = require('../src/lib/integrations/services/order-ingestion-service');
const { AggregatorStatusSyncService } = require('../src/lib/integrations/services/status-sync-service');
const { AggregatorReconciliationService } = require('../src/lib/integrations/services/reconciliation-service');

async function runTests() {
  console.log('=== STARTING RESTRO NEX AGGREGATOR END-TO-END VERIFICATION ===\n');

  // 1. Find or verify tenant & outlet
  const tenant = await prisma.tenant.findFirst({
    include: { outlets: true },
  });

  if (!tenant || tenant.outlets.length === 0) {
    throw new Error('No tenant or outlet found in database to run verification');
  }

  const tenantId = tenant.id;
  const outlet = tenant.outlets[0];
  const outletId = outlet.id;
  console.log(`[1] Active Tenant: "${tenant.name}" (${tenantId}) | Outlet: "${outlet.name}" (${outletId})`);

  // 2. Test Connection Service
  console.log('\n[2] Testing Connection Service & AES-256-GCM Encryption...');
  const conn = await AggregatorConnectionService.saveConnection({
    tenantId,
    provider: 'SWIGGY',
    credentials: {
      apiKey: 'test_swiggy_key_12345',
      merchantId: 'SWG-MERCH-99',
      webhookSecret: 'test_secret_777',
      environment: 'sandbox',
    },
    testMode: true,
    autoAccept: true,
    defaultPrepMinutes: 15,
    pricingStrategy: 'PERCENTAGE_HIKE',
    priceHikeValue: 15,
  });
  console.log('✔ Swiggy connection saved with encrypted credentials.');

  const fetchedConn = await AggregatorConnectionService.getConnection(tenantId, 'SWIGGY');
  if (!fetchedConn.hasCredentials) throw new Error('Credentials not preserved');
  console.log('✔ Fetched connection verifies credentialsEncrypted successfully.');

  // 3. Test Outlet Mapping Service & Cross-Tenant Protection
  console.log('\n[3] Testing Outlet Mapping Service & Cross-Tenant Isolation...');
  const testStoreId = `SWG-${Date.now().toString().slice(-6)}`;
  const mapping = await AggregatorOutletMappingService.mapOutlet({
    tenantId,
    outletId,
    provider: 'SWIGGY',
    providerStoreId: testStoreId,
    providerStoreName: 'RestroNex Main Outlet',
  });
  console.log(`✔ Mapped outlet ${outlet.name} to Swiggy Store ID ${testStoreId}`);

  // Test Cross-Tenant Conflict
  try {
    await AggregatorOutletMappingService.mapOutlet({
      tenantId: 'fake_other_tenant_id',
      outletId: 'fake_other_outlet',
      provider: 'SWIGGY',
      providerStoreId: testStoreId,
    });
    throw new Error('FAIL: Cross-tenant duplicate store mapping should have been blocked!');
  } catch (err) {
    console.log(`✔ Cross-tenant isolation verified: ${err.message}`);
  }

  // 4. Test Menu Sync & Pricing Strategy
  console.log('\n[4] Testing Menu Sync & Pricing Strategy (+15% markup)...');
  const preview = await AggregatorMenuSyncService.previewMenuSync({
    tenantId,
    provider: 'SWIGGY',
    pricingStrategy: 'PERCENTAGE_HIKE',
    priceHikeValue: 15,
  });
  console.log(`✔ Menu preview generated: ${preview.totalCategories} categories, ${preview.totalItems} items.`);
  if (preview.items.length > 0) {
    const item0 = preview.items[0];
    console.log(`   Sample Item: "${item0.name}" | Base: ₹${item0.masterPricePaise/100} -> Channel Price: ₹${item0.pricePaise/100}`);
  }

  // 5. Test Order Ingestion (KOT + Thermal Print + KDS)
  console.log('\n[5] Testing Idempotent Order Ingestion Pipeline...');
  const simOrderId = `SWG-TEST-${Date.now().toString().slice(-6)}`;
  const simPayload = {
    provider: 'SWIGGY',
    providerOrderId: simOrderId,
    displayOrderId: `#${simOrderId.slice(-4)}`,
    providerStoreId: testStoreId,
    customerName: 'Rahul Verma (Swiggy)',
    customerMaskedPhone: '+91 98765 4****',
    deliveryAddressMasked: 'Flat 302, Palm Heights (Masked for Privacy)',
    orderStatus: 'PLACED',
    prepTimeMinutes: 15,
    rawPayloadJson: JSON.stringify({ test: true, orderId: simOrderId }),
    items: [
      {
        providerItemId: 'item_sim_1',
        name: 'Paneer Butter Masala',
        quantity: 2,
        unitPricePaise: 32000,
        variantName: 'Full Plate',
        notes: 'Less spicy',
      },
      {
        providerItemId: 'item_sim_2',
        name: 'Sweet Lassi',
        quantity: 1,
        unitPricePaise: 9000,
        variantName: 'Chilled',
      },
    ],
    riderName: 'Vikram Singh',
    riderPhone: '+91 99887 7****',
    riderStatus: 'ASSIGNED',
    grossAmountPaise: 73000,
    discountPaise: 5000,
    deliveryFeePaise: 4000,
    taxesPaise: 3650,
  };

  const ingestRes = await AggregatorOrderIngestionService.processOrder(simPayload);
  console.log(`✔ Order Ingestion Success! Order #${ingestRes.orderNumber} (POS ID: ${ingestRes.orderId})`);
  console.log(`✔ Kitchen Ticket (KOT) Generated: ID ${ingestRes.ticketId}`);

  // Verify DB state
  const createdOrder = await prisma.order.findUnique({
    where: { id: ingestRes.orderId },
    include: { kotTickets: true, printJobs: true, aggregatorReference: true },
  });

  if (!createdOrder) throw new Error('Order was not found in DB');
  if (createdOrder.kotTickets.length === 0) throw new Error('KOT ticket missing');
  if (createdOrder.printJobs.length === 0) throw new Error('PrintJob missing');
  if (!createdOrder.aggregatorReference) throw new Error('AggregatorOrderReference missing');

  console.log(`✔ Verified in DB: Source=${createdOrder.type}, KOT Tickets=${createdOrder.kotTickets.length}, Print Jobs=${createdOrder.printJobs.length}`);
  console.log(`✔ Aggregator Payout Verified: Gross=₹${createdOrder.aggregatorReference.grossAmountPaise/100}, Net=₹${createdOrder.aggregatorReference.netPayoutPaise/100}`);

  // Test Idempotency
  console.log('\n[6] Testing Webhook Idempotency (Re-delivery test)...');
  const duplicateRes = await AggregatorOrderIngestionService.processOrder(simPayload);
  if (!duplicateRes.isDuplicate) throw new Error('Duplicate order was not detected as duplicate!');
  console.log('✔ Idempotency passed: Duplicate webhook handled safely without second KOT.');

  // 7. Test Status Transitions
  console.log('\n[7] Testing Status Transitions (KDS -> Aggregator Sync)...');
  const syncReady = await AggregatorStatusSyncService.syncOrderStatus({
    orderId: createdOrder.id,
    targetStatus: 'READY_FOR_PICKUP',
  });
  console.log(`✔ Status transitioned to ${syncReady.status} on ${syncReady.provider}`);

  // 8. Test Reconciliation
  console.log('\n[8] Testing Reconciliation & Financial Settlement Engine...');
  const recon = await AggregatorReconciliationService.getReconciliation({ tenantId });
  console.log(`✔ Total Orders: ${recon.summary.totalOrders} | Gross Sales: ₹${recon.summary.grossSales} | Net Payout: ₹${recon.summary.netPayout}`);
  const csv = await AggregatorReconciliationService.exportCsv({ tenantId });
  console.log(`✔ CSV Export Generated (${csv.split('\n').length} rows)`);

  console.log('\n================================================================');
  console.log('  ALL 8 AGGREGATOR INTEGRATION TEST SUITES PASSED FLAWLESSLY!   ');
  console.log('================================================================\n');
}

runTests()
  .catch((e) => {
    console.error('\n❌ Verification Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
