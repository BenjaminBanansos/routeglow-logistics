/**
 * RouteGlow Logistics - Automated Cancellation & Handshake Escalation Worker
 * Enforces the 3.00-minute SLA timeout and immediate 3.01-minute multi-broadcast cascade.
 */

const { db } = require('../database/db');

class EscalationWorker {
  constructor(database = db) {
    this.db = database;
    this.activeTimeouts = new Map();
  }

  /**
   * Minute 0.00: Lead hits Contractor #1 via Twilio SMS/Voice
   */
  initiateLeadDispatch(dispatchResult) {
    const dispatchId = dispatchResult.dispatchId;
    const contractor1 = dispatchResult.assignedContractor;
    const fallbacks = dispatchResult.fallbackArray || [];

    // 1. Trigger Twilio SMS / Voice Dispatch Payload to Contractor #1
    const alertPayload = {
      to: contractor1.phone,
      message: `[RouteGlow Priority Alert] Emergency Request: ${dispatchResult.pricingQuote.serviceCategory} (${dispatchResult.pricingQuote.subType}) at ${dispatchResult.geocoding.neighborhood || 'Client Location'}. Est. Base Payout: $${(dispatchResult.pricingQuote.workerBasePayoutInCents / 100).toFixed(2)} CAD. Reply YES or tap to accept within 3 mins.`
    };

    this.db.recordEscalationLog(
      dispatchId,
      'MINUTE_0.00_INITIAL_LEAD',
      [contractor1.id],
      `Minute 0.00: Lead sent to Contractor #1 (${contractor1.name}, ${contractor1.phone}) via Twilio SMS/Voice. SLA Handshake countdown initiated.`
    );

    return {
      step: 'MINUTE_0.00',
      dispatchId,
      alertPayload,
      handshakeDeadlineMs: 180000 // 3 minutes
    };
  }

  /**
   * Minute 3.00 & 3.01 Execution:
   * Checks if Contractor #1 acknowledged. If not:
   * - Minute 3.00: Suspend Contractor #1 in database & clear on-call flag
   * - Minute 3.01: Simultaneous multi-broadcast to Contractor #2 & Contractor #3
   */
  evaluateHandshakeTimeout(dispatchId, contractor1Id, fallbackContractorIds = []) {
    const hasHandshake = this.db.hasHandshake(dispatchId, contractor1Id);

    if (hasHandshake) {
      this.db.recordEscalationLog(
        dispatchId,
        'HANDSHAKE_RECEIVED',
        [contractor1Id],
        `Handshake verified within 3-minute SLA window. Contractor #1 actively deployed.`
      );
      return {
        escalated: false,
        status: 'ACCEPTED_BY_PRIMARY',
        message: 'Contractor #1 accepted within window.'
      };
    }

    // =========================================================================
    // MINUTE 3.00 TRIGGER: PENALIZE & SUSPEND NON-RESPONDING CONTRACTOR
    // =========================================================================
    const suspendedContractor = this.db.suspendSubcontractorForMissedHandshake(
      contractor1Id,
      'Failed to produce handshake receipt within 3.00-minute SLA emergency window.'
    );

    this.db.recordEscalationLog(
      dispatchId,
      'MINUTE_3.00_TIMEOUT_SUSPENSION',
      [contractor1Id],
      `Minute 3.00: No handshake received from Contractor #1 (${contractor1Id}). Database action executed: account_status='Suspended', is_on_call=false.`
    );

    // =========================================================================
    // MINUTE 3.01 TRIGGER: IMMEDIATE MULTI-BROADCAST TO #2 & #3 SIMULTANEOUSLY
    // =========================================================================
    const broadcastTargets = fallbackContractorIds.slice(0, 2);

    this.db.updateDispatchStatus(dispatchId, 'BROADCAST_MULTI_CONTRACTOR', {
      escalated_at: new Date().toISOString(),
      broadcast_contractor_ids: broadcastTargets
    });

    this.db.recordEscalationLog(
      dispatchId,
      'MINUTE_3.01_MULTI_BROADCAST',
      broadcastTargets,
      `Minute 3.01: Routing lead simultaneously to fallback contractors [${broadcastTargets.join(', ')}] via Google Distance Matrix proximity array.`
    );

    return {
      escalated: true,
      timestamp: new Date().toISOString(),
      suspendedContractorId: contractor1Id,
      suspendedContractorStatus: suspendedContractor ? suspendedContractor.account_status : 'Not_Found',
      broadcastContractorIds: broadcastTargets,
      message: 'Minute 3.00 timeout reached: Contractor #1 suspended. Minute 3.01 dual broadcast sent to closest available contractors.'
    };
  }

  /**
   * Records worker acceptance (handshake receipt)
   */
  acceptLead(dispatchId, subcontractorId, channel = 'SMS_HANDSHAKE', latencySeconds = 45) {
    const receipt = this.db.recordHandshakeReceipt(dispatchId, subcontractorId, channel, latencySeconds);
    this.db.updateDispatchStatus(dispatchId, 'ACCEPTED_ACTIVE', {
      assigned_subcontractor_id: subcontractorId,
      accepted_at: new Date().toISOString()
    });
    return receipt;
  }
}

const escalationWorker = new EscalationWorker();
module.exports = { EscalationWorker, escalationWorker };
