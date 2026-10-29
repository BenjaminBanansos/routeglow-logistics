-- =========================================================================
-- ROUTEGLOW LOGISTICS MASTER DATABASE SCHEMA
-- PostgreSQL / Supabase Compatible DDL
-- Enforcing Vicarious Liability Elimination & Ontario Regulatory Compliance
-- =========================================================================

-- ENUMS DEFINITION
CREATE TYPE worker_type_enum AS ENUM (
    'Casual_Gig_Worker',
    'Independent_Business'
);

CREATE TYPE service_city_enum AS ENUM (
    'Ottawa',
    'Toronto'
);

CREATE TYPE account_status_enum AS ENUM (
    'Pending_Verification',
    'Active_On_Call',
    'Suspended'
);

CREATE TYPE service_category_enum AS ENUM (
    'Plumbing',
    'Electrical',
    'HVAC',
    'Winter_Clearing',
    'Landscaping'
);

CREATE TYPE dispatch_status_enum AS ENUM (
    'PENDING_ROUTING',
    'DISPATCHED_CONTRACTOR_1',
    'ESCALATED_HANDSHAKE_TIMEOUT',
    'BROADCAST_MULTI_CONTRACTOR',
    'ACCEPTED_ACTIVE',
    'COMPLETED',
    'CANCELLED'
);

-- =========================================================================
-- 1. SUBCONTRACTORS REGISTRY TABLE
-- Strict privity of contract, indemnification & liability flags
-- =========================================================================
CREATE TABLE subcontractors_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_type worker_type_enum NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number_e164 VARCHAR(32) NOT NULL,
    service_city service_city_enum NOT NULL,
    assigned_postal_prefixes TEXT[] NOT NULL DEFAULT '{}',
    equipment_verified TEXT[] NOT NULL DEFAULT '{}',
    
    -- CONTRACTUAL BOUNDARY: The worker explicitly agrees RouteGlow assumes zero responsibility
    -- for physical labor outcomes. The worker inherits 100% of property damage or physical risk liability.
    agreement_full_liability_assumption BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- LEGAL HOLD HARMLESS: Worker legally agrees to defend, indemnify, and hold harmless RouteGlow Logistics
    -- from all customer claims, legal demands, lawsuits, or financial losses caused by the worker's physical operations.
    agreement_indemnification_clause BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- CONDUCT CHARTER: Worker agrees to act professionally, communicate politely, arrive within allocated 60-min SLA window,
    -- and maintain active safety equipment usage on-site.
    agreement_proper_conduct_standard BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- PRIVITY OF CONTRACT: Worker acknowledges that a binding execution agreement is formed strictly between the worker
    -- and property owner the moment they tap 'Accept' on a dispatch route.
    agreement_direct_customer_responsibility BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Ontario WSIB Independent Worker Classification Verification
    wsib_exemption_signed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Stripe Connect for instant automated payout transfer
    stripe_connected_account_id VARCHAR(128) NOT NULL,
    
    -- State lifecycle
    account_status account_status_enum NOT NULL DEFAULT 'Pending_Verification',
    is_on_call BOOLEAN NOT NULL DEFAULT FALSE,
    
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_ping_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for hyper-local sub-millisecond lookup
CREATE INDEX idx_subcontractors_routing ON subcontractors_registry (
    service_city,
    account_status,
    is_on_call,
    agreement_full_liability_assumption,
    agreement_indemnification_clause,
    agreement_proper_conduct_standard,
    agreement_direct_customer_responsibility
);

-- =========================================================================
-- 2. DISPATCH INCIDENTS TABLE
-- Records inbound emergency triage and authorization state
-- =========================================================================
CREATE TABLE dispatch_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    incident_address VARCHAR(500) NOT NULL,
    city service_city_enum NOT NULL,
    postal_code_prefix VARCHAR(3) NOT NULL,
    service_category service_category_enum NOT NULL,
    sub_type VARCHAR(255) NOT NULL,
    
    platform_fee_in_cents INTEGER NOT NULL DEFAULT 4500, -- $45.00 CAD
    worker_base_payout_in_cents INTEGER NOT NULL,
    surcharges_in_cents INTEGER NOT NULL DEFAULT 0,
    total_pre_auth_cents INTEGER NOT NULL,
    
    stripe_payment_intent_id VARCHAR(128),
    payment_status VARCHAR(64) DEFAULT 'PRE_AUTHORIZED',
    verbal_authorization_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    status dispatch_status_enum NOT NULL DEFAULT 'PENDING_ROUTING',
    assigned_subcontractor_id UUID REFERENCES subcontractors_registry(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 3. ESCALATION LOGS & AUDIT TRAIL
-- Minute 0.00 -> Minute 3.00 Timeout -> Minute 3.01 Multi-Broadcast
-- =========================================================================
CREATE TABLE dispatch_escalation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatch_requests(id) ON DELETE CASCADE,
    step VARCHAR(64) NOT NULL, -- 'INITIAL_LEAD', 'TIMEOUT_SUSPENSION', 'MULTI_BROADCAST'
    target_subcontractor_ids UUID[] NOT NULL,
    action_note TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 4. HANDSHAKE RECEIPTS
-- Instant proof of contractor acknowledgment within 3-minute SLA window
-- =========================================================================
CREATE TABLE handshake_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatch_requests(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES subcontractors_registry(id),
    channel VARCHAR(32) NOT NULL, -- 'SMS_HANDSHAKE', 'VOICE_DTMF', 'APP_ACCEPT'
    response_latency_seconds NUMERIC(6, 2) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 5. STRICT LIABILITY GATE VIEW
-- Guarantees zero vicarious liability leakage in all database queries
-- =========================================================================
CREATE OR REPLACE VIEW eligible_active_contractors AS
SELECT *
FROM subcontractors_registry
WHERE account_status = 'Active_On_Call'
  AND is_on_call = TRUE
  AND agreement_full_liability_assumption = TRUE
  AND agreement_indemnification_clause = TRUE
  AND agreement_proper_conduct_standard = TRUE
  AND agreement_direct_customer_responsibility = TRUE;
