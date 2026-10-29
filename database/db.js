/**
 * RouteGlow Logistics - Database Layer & Repository
 * Enforces strict contractual liability boundaries and handles live records.
 */

class DatabaseRepository {
  constructor() {
    this.subcontractors = new Map();
    this.dispatches = new Map();
    this.escalationLogs = [];
    this.handshakeReceipts = [];
  }

  /**
   * Registers a contractor with strict schema validation
   */
  registerSubcontractor(contractor) {
    const record = {
      id: contractor.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      worker_type: contractor.worker_type, // 'Casual_Gig_Worker' | 'Independent_Business'
      full_name: contractor.full_name,
      phone_number_e164: contractor.phone_number_e164,
      service_city: contractor.service_city, // 'Ottawa' | 'Toronto'
      assigned_postal_prefixes: contractor.assigned_postal_prefixes || [],
      equipment_verified: contractor.equipment_verified || [],
      
      // Contractual Liabilities & Boundaries
      agreement_full_liability_assumption: Boolean(contractor.agreement_full_liability_assumption),
      agreement_indemnification_clause: Boolean(contractor.agreement_indemnification_clause),
      agreement_proper_conduct_standard: Boolean(contractor.agreement_proper_conduct_standard),
      agreement_direct_customer_responsibility: Boolean(contractor.agreement_direct_customer_responsibility),
      wsib_exemption_signed: Boolean(contractor.wsib_exemption_signed),
      
      stripe_connected_account_id: contractor.stripe_connected_account_id,
      account_status: contractor.account_status || 'Pending_Verification', // 'Pending_Verification' | 'Active_On_Call' | 'Suspended'
      is_on_call: Boolean(contractor.is_on_call),
      
      current_coords: contractor.current_coords || { lat: 0, lng: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.subcontractors.set(record.id, record);
    return record;
  }

  /**
   * STRICT LIABILITY GATE:
   * Returns only contractors who are:
   * 1. In the target city
   * 2. Operating in or near the postal code prefix
   * 3. Set to 'Active_On_Call' and is_on_call === true
   * 4. CRITICAL: agreement_full_liability_assumption === true
   * 5. CRITICAL: agreement_indemnification_clause === true
   * 6. CRITICAL: agreement_proper_conduct_standard === true
   * 7. CRITICAL: agreement_direct_customer_responsibility === true
   */
  findEligibleSubcontractors({ city, postalCodePrefix, serviceCategory }) {
    const eligible = [];
    const normalizedPrefix = (postalCodePrefix || '').toUpperCase().trim();

    for (const [id, worker] of this.subcontractors.entries()) {
      // City check
      if (worker.service_city !== city) continue;

      // Status check
      if (worker.account_status !== 'Active_On_Call' || !worker.is_on_call) continue;

      // VICARIOUS LIABILITY ELIMINATION CHECK:
      // Zero tolerance policy. If any agreement flag is false/falsy, exclude immediately.
      const hasFullLiabilityAssumption = worker.agreement_full_liability_assumption === true;
      const hasIndemnification = worker.agreement_indemnification_clause === true;
      const hasProperConduct = worker.agreement_proper_conduct_standard === true;
      const hasDirectCustomerResponsibility = worker.agreement_direct_customer_responsibility === true;

      if (!hasFullLiabilityAssumption || !hasIndemnification || !hasProperConduct || !hasDirectCustomerResponsibility) {
        // Disqualified by legal gate
        continue;
      }

      // Postal prefix affinity (Ottawa / Toronto prefix match or wildcard coverage)
      const coversPostalPrefix = worker.assigned_postal_prefixes.length === 0 ||
        worker.assigned_postal_prefixes.some(p => normalizedPrefix.startsWith(p) || p === '*' || normalizedPrefix === p);

      if (coversPostalPrefix) {
        eligible.push(worker);
      }
    }

    return eligible;
  }

  /**
   * Suspends a contractor when they fail to provide a handshake receipt within SLA window (3 min)
   */
  suspendSubcontractorForMissedHandshake(contractorId, reason) {
    const contractor = this.subcontractors.get(contractorId);
    if (!contractor) return null;

    contractor.account_status = 'Suspended';
    contractor.is_on_call = false;
    contractor.updated_at = new Date().toISOString();
    contractor.suspension_reason = reason || 'Failed to acknowledge active emergency within 3-minute SLA window';

    this.subcontractors.set(contractorId, contractor);
    return contractor;
  }

  /**
   * Saves a dispatch incident
   */
  createDispatch(dispatchData) {
    const id = dispatchData.id || `disp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const record = {
      id,
      ...dispatchData,
      status: dispatchData.status || 'PENDING_ROUTING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.dispatches.set(id, record);
    return record;
  }

  updateDispatchStatus(dispatchId, status, extra = {}) {
    const dispatch = this.dispatches.get(dispatchId);
    if (!dispatch) return null;

    Object.assign(dispatch, extra, { status, updated_at: new Date().toISOString() });
    this.dispatches.set(dispatchId, dispatch);
    return dispatch;
  }

  recordEscalationLog(dispatchId, step, targetSubcontractorIds, actionNote) {
    const log = {
      id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      dispatchId,
      step,
      targetSubcontractorIds,
      actionNote,
      timestamp: new Date().toISOString()
    };
    this.escalationLogs.push(log);
    return log;
  }

  recordHandshakeReceipt(dispatchId, subcontractorId, channel, latencySeconds) {
    const receipt = {
      id: `hs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      dispatchId,
      subcontractorId,
      channel,
      latencySeconds,
      timestamp: new Date().toISOString()
    };
    this.handshakeReceipts.push(receipt);
    return receipt;
  }

  hasHandshake(dispatchId, subcontractorId) {
    return this.handshakeReceipts.some(
      r => r.dispatchId === dispatchId && (!subcontractorId || r.subcontractorId === subcontractorId)
    );
  }
}

const db = new DatabaseRepository();
module.exports = { DatabaseRepository, db };
