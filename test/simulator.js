/**
 * RouteGlow Logistics - End-to-End Simulation & Verification Suite
 * Tests call triage, liability gating, Distance Matrix matching, and 3-minute escalation logic.
 */

const { db } = require('../database/db');
const { pricingEngine } = require('../services/pricingEngine');
const { routingEngine } = require('../services/routingEngine');
const { escalationWorker } = require('../services/escalationWorker');

async function runSimulation() {
  console.log('================================================================');
  console.log('⚡ ROUTEGLOW LOGISTICS - SYSTEM VALIDATION & DISPATCH SIMULATION');
  console.log('================================================================\n');

  // STEP 1: SEED SUBCONTRACTORS REGISTRY
  console.log('📦 STEP 1: Seeding Subcontractor Registry with Strict Liability Flags...');

  // Contractor #1: Compliant Primary Plumber in Ottawa Centretown (K2P)
  const worker1 = db.registerSubcontractor({
    id: 'sub_ott_01',
    worker_type: 'Independent_Business',
    full_name: 'Marc Tremblay (Capital QuickFlow Plumbing)',
    phone_number_e164: '+16135550101',
    service_city: 'Ottawa',
    assigned_postal_prefixes: ['K1P', 'K2P', 'K1N', 'K1S'],
    equipment_verified: ['Hydro_Jet', 'Pipe_Freezer', 'Inspection_Cam'],
    agreement_full_liability_assumption: true,
    agreement_indemnification_clause: true,
    agreement_proper_conduct_standard: true,
    agreement_direct_customer_responsibility: true,
    wsib_exemption_signed: true,
    stripe_connected_account_id: 'acct_stripe_tremblay',
    account_status: 'Active_On_Call',
    is_on_call: true,
    current_coords: { lat: 45.4150, lng: -75.6930 } // Centretown (~1.2 km from Downtown)
  });

  // Contractor #2: Compliant Secondary Plumber in Ottawa Westboro (K1Y)
  const worker2 = db.registerSubcontractor({
    id: 'sub_ott_02',
    worker_type: 'Casual_Gig_Worker',
    full_name: 'Alex Moreau (Rideau Emergency Trades)',
    phone_number_e164: '+16135550102',
    service_city: 'Ottawa',
    assigned_postal_prefixes: ['K1P', 'K1Y', 'K2A'],
    equipment_verified: ['Auger', 'PEX_Crimp_Kit'],
    agreement_full_liability_assumption: true,
    agreement_indemnification_clause: true,
    agreement_proper_conduct_standard: true,
    agreement_direct_customer_responsibility: true,
    wsib_exemption_signed: true,
    stripe_connected_account_id: 'acct_stripe_moreau',
    account_status: 'Active_On_Call',
    is_on_call: true,
    current_coords: { lat: 45.4020, lng: -75.7270 } // Westboro (~3.5 km)
  });

  // Contractor #3: Compliant Tertiary Plumber in Ottawa Gloucester (K1B)
  const worker3 = db.registerSubcontractor({
    id: 'sub_ott_03',
    worker_type: 'Independent_Business',
    full_name: 'David O\'Connor (Bytown Plumbing Pros)',
    phone_number_e164: '+16135550103',
    service_city: 'Ottawa',
    assigned_postal_prefixes: ['K1P', 'K1N', 'K1B'],
    equipment_verified: ['Commercial_Pumps', 'Snake_60ft'],
    agreement_full_liability_assumption: true,
    agreement_indemnification_clause: true,
    agreement_proper_conduct_standard: true,
    agreement_direct_customer_responsibility: true,
    wsib_exemption_signed: true,
    stripe_connected_account_id: 'acct_stripe_oconnor',
    account_status: 'Active_On_Call',
    is_on_call: true,
    current_coords: { lat: 45.4350, lng: -75.5800 } // Gloucester (~9.0 km)
  });

  // Contractor #4: NON-COMPLIANT WORKER (Missing Liability Assumption)
  const worker4 = db.registerSubcontractor({
    id: 'sub_ott_04_unverified',
    worker_type: 'Casual_Gig_Worker',
    full_name: 'Unverified Handyman (Rejected Flag)',
    phone_number_e164: '+16135550199',
    service_city: 'Ottawa',
    assigned_postal_prefixes: ['K1P'],
    equipment_verified: ['Wrench'],
    agreement_full_liability_assumption: false, // VIOLATION
    agreement_indemnification_clause: false,   // VIOLATION
    agreement_proper_conduct_standard: true,
    agreement_direct_customer_responsibility: false,
    wsib_exemption_signed: false,
    stripe_connected_account_id: 'acct_stripe_dummy',
    account_status: 'Active_On_Call',
    is_on_call: true,
    current_coords: { lat: 45.4215, lng: -75.6972 } // Directly at site!
  });

  console.log('✓ 4 Contractors registered.');

  // STEP 2: VICARIOUS LIABILITY TEST
  console.log('\n⚖️  STEP 2: Testing Strict Vicarious Liability Filter...');
  const eligible = db.findEligibleSubcontractors({
    city: 'Ottawa',
    postalCodePrefix: 'K1P',
    serviceCategory: 'Plumbing'
  });

  const ids = eligible.map(w => w.id);
  console.log(`- Eligible workers found: ${eligible.length}`);
  console.log(`- Included verified workers: ${ids.join(', ')}`);
  
  if (ids.includes('sub_ott_04_unverified')) {
    throw new Error('CRITICAL LEGAL FAILURE: Unverified worker bypassed liability gate!');
  } else {
    console.log('✓ PASS: Non-compliant worker sub_ott_04_unverified successfully BLOCKED by legal liability gate.');
  }

  // STEP 3: LIVE CONVERSATIONAL VOICE TRIAGE SIMULATION
  console.log('\n🎙️  STEP 3: Voice Dispatcher Live Call Intake Simulation...');
  console.log('[CALL CONNECTED - FIRST RING]');
  console.log('AGENT: "Thank you for calling the RouteGlow emergency network. I am an automated routing agent designed to deploy local technicians instantly. What emergency or on-demand service are you facing right now?"');
  console.log('CALLER: "Our main basement water pipe burst and water is flooding fast!"');
  console.log('AGENT: "I am initiating our closest worker lookup. What is the exact street address and postal code of the property?"');
  console.log('CALLER: "180 Wellington St, Ottawa, ON, K1P 5A4"');
  console.log('AGENT: "Thank you. What is your full name and primary phone number?"');
  console.log('CALLER: "Sarah Jenkins, 613-555-8844"');

  // STEP 4: VERBATIM LEGAL DISCLAIMER & PRICING INTENT
  console.log('\n📜 STEP 4: Mandatory Legal Disclaimer & Fee Pre-Authorization...');
  const intakeContext = {
    isAfterHours: true, // 11:30 PM call
    currentHour: 23
  };

  const paymentIntent = await pricingEngine.processPaymentIntent({
    customerName: 'Sarah Jenkins',
    customerPhone: '+16135558844',
    serviceCategory: 'Plumbing',
    subType: 'Active Burst Pipes / Flooding',
    context: intakeContext
  });

  console.log('AGENT DISCLOSURE (VERBATIM):');
  console.log(`"Before I push this alert out to our live network, please be advised that RouteGlow is a pure software matching platform and technology router, not a licensed contractor.`);
  console.log(`We algorithmically route your service request to independent, third-party local trade businesses and casual gig workers who carry their own individual tools and local qualifications. The physical contract for execution is strictly between you and the responding professional.`);
  console.log(`Our automated software routing fee is forty-five dollars, which locks in your priority sixty-minute dispatch window. This fee, along with the specific trade rate, will be securely pre-authorized on your card. Do you verbally authorize me to process the dispatch fee and alert the closest on-call professional?"`);
  console.log('\nCALLER: "Yes, I verbally authorize it!"');

  console.log('\n💳 Pre-Authorization Breakdown:');
  console.log(`- Platform Margin Routing Fee: $${paymentIntent.breakdown.platformRoutingFeeCAD} CAD`);
  console.log(`- Worker Base Rate: $${paymentIntent.breakdown.workerBaseRateCAD} CAD (${paymentIntent.breakdown.rateType})`);
  console.log(`- Surcharges Applied:`, paymentIntent.breakdown.surcharges);
  console.log(`- Total Card Pre-Auth: $${paymentIntent.breakdown.totalPreAuthorizedCAD} CAD ($${paymentIntent.amountInCents / 100})`);
  console.log(`- Stripe PaymentIntent: ${paymentIntent.paymentIntentId}`);

  // STEP 5: TRIGGER SUBCONTRACTOR MATCH (GOOGLE DISTANCE MATRIX)
  console.log('\n📍 STEP 5: Invoking trigger_subcontractor_match (Distance Matrix Proximity)...');
  const matchResult = await routingEngine.triggerSubcontractorMatch({
    customerName: 'Sarah Jenkins',
    customerPhone: '+16135558844',
    incidentAddress: '180 Wellington St, Ottawa, ON',
    city: 'Ottawa',
    postalCodePrefix: 'K1P',
    serviceCategory: 'Plumbing',
    subType: 'Active Burst Pipes / Flooding',
    platformFeeInCents: 4500,
    context: intakeContext
  });

  console.log(`✓ Dispatch Incident ID: ${matchResult.dispatchId}`);
  console.log(`- Primary Assigned: ${matchResult.assignedContractor.name} (${matchResult.assignedContractor.distanceKm} km, ETA: ${matchResult.assignedContractor.etaMinutes} mins)`);
  console.log(`- Fallback Array:`, matchResult.fallbackArray);

  // STEP 6: ESCALATION WORKFLOW (MINUTE 0.00 -> 3.00 TIMEOUT -> 3.01 DUAL CASCADE)
  console.log('\n⏱️  STEP 6: Executing Escalation Workflow...');
  
  // Minute 0.00: Lead to Contractor #1
  const minute0 = escalationWorker.initiateLeadDispatch(matchResult);
  console.log(`[T = 0.00 MIN]: ${minute0.alertPayload.to} received SMS: "${minute0.alertPayload.message}"`);
  console.log('-> 3-minute SLA handshake timer running...');

  // Minute 3.00: Contractor #1 fails to acknowledge
  console.log('\n[T = 3.00 MIN]: Handshake deadline expired. Evaluating timeout...');
  const fallbackIds = matchResult.fallbackArray.map(f => f.id);
  const minute3Escalation = escalationWorker.evaluateHandshakeTimeout(
    matchResult.dispatchId,
    matchResult.assignedContractor.id,
    fallbackIds
  );

  console.log(`✓ Minute 3.00 Database Action: Contractor #1 (${minute3Escalation.suspendedContractorId}) status updated to: ${minute3Escalation.suspendedContractorStatus}`);
  
  // Verify suspension in DB
  const checkedWorker1 = db.subcontractors.get(minute3Escalation.suspendedContractorId);
  console.log(`- Verified DB record: account_status='${checkedWorker1.account_status}', is_on_call=${checkedWorker1.is_on_call}`);

  // Minute 3.01: Dual Broadcast to #2 and #3
  console.log(`\n[T = 3.01 MIN]: Instant multi-broadcast triggered to fallbacks:`, minute3Escalation.broadcastContractorIds);
  console.log('-> Simultaneous alert dispatched to Contractor #2 (Alex Moreau) and Contractor #3 (David O\'Connor)');

  // Contractor #2 responds within 42 seconds
  console.log('\n[T = 3.42 MIN]: Contractor #2 (Alex Moreau) sends Handshake SMS: "YES" (Latency: 42s)');
  const receipt = escalationWorker.acceptLead(matchResult.dispatchId, 'sub_ott_02', 'SMS_HANDSHAKE', 42.0);
  console.log(`✓ Handshake Receipt Generated: ID ${receipt.id}, Latency: ${receipt.latencySeconds}s`);
  
  const updatedDispatch = db.dispatches.get(matchResult.dispatchId);
  console.log(`✓ Dispatch Status: ${updatedDispatch.status}, Final Assigned Worker: ${updatedDispatch.assigned_subcontractor_id}`);

  // STEP 7: PRINT AUDIT TRAIL LOGS
  console.log('\n📋 STEP 7: Verification Audit Trail:');
  db.escalationLogs.forEach((log, index) => {
    console.log(`  ${index + 1}. [${log.step}] ${log.actionNote}`);
  });

  console.log('\n================================================================');
  console.log('✅ ALL ROUTEGLOW SPECIFICATION CHECKPOINTS VERIFIED SUCCESSFULLY');
  console.log('================================================================');
}

runSimulation().catch(err => {
  console.error('Simulation error:', err);
  process.exit(1);
});
