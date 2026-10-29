/**
 * ROUTEGLOW LOGISTICS ENGINE - MASTER ENTRY POINT
 * Automated, hyper-local software routing network for Ottawa and Toronto regional grids.
 */

const { db, DatabaseRepository } = require('./database/db');
const { pricingEngine, PricingEngine } = require('./services/pricingEngine');
const { routingEngine, RoutingEngine, REGIONAL_GRID_COORDINATES } = require('./services/routingEngine');
const { escalationWorker, EscalationWorker } = require('./services/escalationWorker');
const serviceMatrixConfig = require('./config/service_matrix.json');
const geminiVoiceTools = require('./voice/geminiVoiceTools.json');

module.exports = {
  db,
  DatabaseRepository,
  pricingEngine,
  PricingEngine,
  routingEngine,
  RoutingEngine,
  REGIONAL_GRID_COORDINATES,
  escalationWorker,
  EscalationWorker,
  serviceMatrix: serviceMatrixConfig,
  geminiVoiceTools
};
