# RouteGlow Logistics Master Engine
**Operational Environment:** Ottawa (K-series) & Toronto (M-series) Regional Grid Systems  
**Core Model:** Gemini 1.5 Flash (Voice-Native Mode)  
**Platform Identity:** RouteGlow AI Dispatcher  

---

## Architecture Overview

```
                                      [ INBOUND CALL ]
                                             │
                                             ▼
                                [ RouteGlow AI Dispatcher ]
                                 (Gemini 1.5 Flash Voice)
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             Phase A: Intake & Triage                   Phase B: Verbatim Disclaimer
         (Address, Name, Emergency Type)             (Pure Router, $45 CAD Platform Fee,
                       │                                Direct Privity of Contract)
                       ▼                                           │
         [ process_payment_intent ] ◄──────────────────────────────┘
         (Pre-Auth Platform Fee +
          Trade Rate + Surcharges)
                       │
                       ▼
       [ trigger_subcontractor_match ]
                       │
         ┌─────────────┴────────────────────────┐
         ▼                                      ▼
[ Strict Liability Gate ]            [ Google Distance Matrix ]
• Full liability assumption           • Proximity array ranking
• Indemnification agreement           • ETA & distance calculation
• Conduct standard charter            • SLA: 60-min priority window
• Direct customer privity
• WSIB worker exemption
         │
         ▼
[ Automated Escalation Worker ]
• Minute 0.00: Alert Contractor #1 (Twilio SMS/Voice)
• Minute 3.00: If no handshake -> Suspend Contractor #1 (DB status = 'Suspended', is_on_call = false)
• Minute 3.01: Immediate dual broadcast to Contractor #2 & #3 simultaneously
```

---

## 1. Directory Structure

```
routeglow/
├── index.js                     # Master package export
├── README.md                    # Engine architecture & operational manual
├── config/
│   └── service_matrix.json      # Dynamic service pricing & surcharge catalog
├── database/
│   ├── schema.sql               # PostgreSQL / Supabase DDL with liability enums & views
│   └── db.js                    # Database repository with strict liability filtering
├── services/
│   ├── pricingEngine.js         # process_payment_intent pricing calculation
│   ├── routingEngine.js         # trigger_subcontractor_match (Distance Matrix + Geocoding)
│   └── escalationWorker.js      # 3.00-min timeout & 3.01-min dual broadcast escalation
├── voice/
│   ├── system_prompt.md         # Voice agent instructions & verbatim disclaimer
│   └── geminiVoiceTools.json    # Gemini function calling declarations
└── test/
    └── simulator.js             # End-to-end simulation test suite
```

---

## 2. Regulatory & Legal Safeguards (Vicarious Liability Protection)

To shield RouteGlow from vicarious liability and maintain classification as a software router rather than an employer or licensed contractor:

1. **Mandatory Caller Disclaimer (Verbatim):**
   > *"Before I push this alert out to our live network, please be advised that RouteGlow is a pure software matching platform and technology router, not a licensed contractor. We algorithmically route your service request to independent, third-party local trade businesses and casual gig workers who carry their own individual tools and local qualifications. The physical contract for execution is strictly between you and the responding professional. Our automated software routing fee is forty-five dollars, which locks in your priority sixty-minute dispatch window. This fee, along with the specific trade rate, will be securely pre-authorized on your card. Do you verbally authorize me to process the dispatch fee and alert the closest on-call professional?"*

2. **Database Privity and Indemnification Gate:**
   - Any contractor queried via `findEligibleSubcontractors` must have all four agreement flags set to `true`:
     - `agreement_full_liability_assumption`
     - `agreement_indemnification_clause`
     - `agreement_proper_conduct_standard`
     - `agreement_direct_customer_responsibility`
   - Incomplete registrations are blocked automatically at query time.

3. **Ontario WSIB Exemption Tracking:**
   - Field `wsib_exemption_signed` verified for independent contractor compliance.

---

## 3. Testing and Verification

Run the test simulator:

```bash
node routeglow/test/simulator.js
```
