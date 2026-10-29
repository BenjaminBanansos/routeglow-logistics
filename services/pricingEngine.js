/**
 * RouteGlow Logistics - Dynamic Pricing & Payment Intent Engine
 * Implements the Complex Service & Fees Structure Matrix.
 */

const serviceMatrixConfig = require('../config/service_matrix.json');

class PricingEngine {
  constructor(matrix = serviceMatrixConfig) {
    this.matrix = matrix.serviceMatrix;
    this.basePlatformFeeCAD = matrix.platform.baseDispatchFeeCAD;
    this.basePlatformFeeInCents = matrix.platform.baseDispatchFeeInCents;
  }

  /**
   * Evaluates pricing parameters and returns breakdown for process_payment_intent
   * 
   * @param {Object} options
   * @param {string} options.serviceCategory - 'Plumbing', 'Winter_Clearing', 'Electrical', 'HVAC', 'Landscaping'
   * @param {string} options.subType - Sub-type name matching service matrix
   * @param {Object} [options.context] - Dynamic operational variables:
   *   - isAfterHours: boolean (10 PM - 6 AM)
   *   - isCommercialLine: boolean
   *   - hasRainAlert: boolean
   *   - snowAccumulationCm: number
   *   - requiresIceChopping: boolean
   *   - temperatureCelsius: number
   *   - lacksDumpAccess: boolean
   *   - powerLinesEntangled: boolean
   *   - quantityOrHours: number (default 1)
   */
  calculateQuote({ serviceCategory, subType, context = {} }) {
    const categoryConfig = this.matrix[serviceCategory];
    if (!categoryConfig) {
      throw new Error(`Invalid service category: ${serviceCategory}`);
    }

    // Match subType case-insensitively or via prefix
    let matchedKey = Object.keys(categoryConfig.subTypes).find(
      key => key.toLowerCase() === (subType || '').toLowerCase()
    );

    if (!matchedKey) {
      // Fallback matching
      matchedKey = Object.keys(categoryConfig.subTypes).find(
        key => key.toLowerCase().includes((subType || '').toLowerCase()) ||
               (subType || '').toLowerCase().includes(key.toLowerCase())
      );
    }

    if (!matchedKey) {
      // Default to first subType if not found
      matchedKey = Object.keys(categoryConfig.subTypes)[0];
    }

    const subTypeConfig = categoryConfig.subTypes[matchedKey];
    const platformFeeCAD = this.basePlatformFeeCAD;
    const workerBasePayoutCAD = subTypeConfig.workerBasePayoutCAD;
    const surcharges = [];

    // Check dynamic surcharges
    // 1. After-hours (10 PM - 6 AM)
    const currentHour = context.currentHour !== undefined ? context.currentHour : new Date().getHours();
    const isAfterHours = context.isAfterHours !== undefined ? context.isAfterHours : (currentHour >= 22 || currentHour < 6);

    if (matchedKey === 'Active Burst Pipes / Flooding' && isAfterHours) {
      surcharges.push({
        trigger: 'after_hours',
        description: 'After-hours (10 PM - 6 AM)',
        amountCAD: 50.00
      });
    }

    // 2. Commercial lines
    if (matchedKey === 'Water Clogging / Sewage Backup' && context.isCommercialLine) {
      surcharges.push({
        trigger: 'commercial_lines',
        description: 'Commercial lines surcharge',
        amountCAD: 35.00
      });
    }

    // 3. Rain alerts
    if (matchedKey === 'Sump Pump Failures' && context.hasRainAlert) {
      surcharges.push({
        trigger: 'rain_alert',
        description: 'During active rain alerts',
        amountCAD: 25.00
      });
    }

    // 4. Snow accumulation > 15cm
    if ((matchedKey === 'Driveway Snow Removal') && (context.snowAccumulationCm > 15)) {
      surcharges.push({
        trigger: 'snow_over_15cm',
        description: 'Snow accumulation exceeding 15cm',
        amountCAD: 20.00
      });
    }

    if ((matchedKey === 'Bundled Driveway + Walkway') && (context.snowAccumulationCm > 15)) {
      surcharges.push({
        trigger: 'snow_over_15cm',
        description: 'Snow accumulation exceeding 15cm (Bundled)',
        amountCAD: 30.00
      });
    }

    // 5. Ice-scraping / chopping
    if (matchedKey === 'Walkway Cleaning & Salting' && context.requiresIceChopping) {
      surcharges.push({
        trigger: 'ice_scraping_chopping',
        description: 'Ice-scraping & heavy chopping surcharge',
        amountCAD: 15.00
      });
    }

    // 6. Deep freeze (< -15°C)
    if (matchedKey === 'No-Heat Failure (Deep Winter)' && (context.temperatureCelsius !== undefined && context.temperatureCelsius < -15)) {
      surcharges.push({
        trigger: 'deep_freeze',
        description: 'Extreme deep freeze weather (< -15°C)',
        amountCAD: 50.00
      });
    }

    // 7. No dump access
    if (matchedKey === 'Immediate Soil/Mulch Delivery' && context.lacksDumpAccess) {
      surcharges.push({
        trigger: 'no_dump_access',
        description: 'Delivery site lacks direct dump access',
        amountCAD: 40.00
      });
    }

    // 8. Power lines entangled
    if (matchedKey === 'Post-Storm Debris/Tree Removal' && context.powerLinesEntangled) {
      surcharges.push({
        trigger: 'power_lines_entangled',
        description: 'Power lines entanglement hazard',
        amountCAD: 60.00
      });
    }

    // Electrical live smoke emergency escalation
    const isEmergencyEscalation = Boolean(subTypeConfig.emergencyEscalation);

    const totalSurchargesCAD = surcharges.reduce((acc, s) => acc + s.amountCAD, 0);
    const totalPreAuthCAD = platformFeeCAD + workerBasePayoutCAD + totalSurchargesCAD;

    return {
      serviceCategory,
      subType: matchedKey,
      payoutType: subTypeConfig.payoutType,
      isEmergencyEscalation,
      currency: 'CAD',
      platformFeeCAD,
      platformFeeInCents: Math.round(platformFeeCAD * 100),
      workerBasePayoutCAD,
      workerBasePayoutInCents: Math.round(workerBasePayoutCAD * 100),
      surcharges,
      totalSurchargesCAD,
      totalSurchargesInCents: Math.round(totalSurchargesCAD * 100),
      totalPreAuthCAD,
      totalPreAuthInCents: Math.round(totalPreAuthCAD * 100)
    };
  }

  /**
   * process_payment_intent Tool Implementation
   * Simulates Stripe payment pre-authorization on caller's card
   */
  async processPaymentIntent({
    customerPhone,
    customerName,
    serviceCategory,
    subType,
    context = {}
  }) {
    const quote = this.calculateQuote({ serviceCategory, subType, context });
    
    // Simulate pre-authorization with Stripe
    const paymentIntentId = `pi_rg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    return {
      success: true,
      paymentIntentId,
      status: 'requires_capture',
      amountInCents: quote.totalPreAuthInCents,
      currency: 'cad',
      description: `RouteGlow Priority 60-min Dispatch Pre-Auth for ${serviceCategory} (${quote.subType})`,
      breakdown: {
        platformRoutingFeeCAD: quote.platformFeeCAD.toFixed(2),
        workerBaseRateCAD: quote.workerBasePayoutCAD.toFixed(2),
        rateType: quote.payoutType,
        surcharges: quote.surcharges,
        totalPreAuthorizedCAD: quote.totalPreAuthCAD.toFixed(2)
      },
      verbalDisclosureSummary: `$${quote.platformFeeCAD.toFixed(2)} platform routing fee + $${quote.workerBasePayoutCAD.toFixed(2)} (${quote.payoutType}) trade rate${quote.totalSurchargesCAD > 0 ? ` + $${quote.totalSurchargesCAD.toFixed(2)} surcharges` : ''}`
    };
  }
}

const pricingEngine = new PricingEngine();
module.exports = { PricingEngine, pricingEngine };
