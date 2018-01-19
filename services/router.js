const passport = require('passport');

const UserController = require('../controllers/user_controller');
const BankController = require('../controllers/banks_controller');
const WalletController = require('../controllers/wallets_controller');
const ShapeshiftController = require('../controllers/shapeshift_controller');
const rateLimit = require('./rateLimit');
// the following will take passport and will make some requirements on it
const passportService = require('./passport');

let requireAuth = passport.authenticate('jwt', {session: false});
let requireLogin = passport.authenticate('local', {session: false});
let router = require('express').Router();

let apiKey;

if (process.env.NODE_ENV === 'production') {
  apiKey = process.env.APIKEY;
} else {
  apiKey = require('../configs/config').APIKEY;
}

function requireAPIKey(req, res, next) {
  if (req.headers.apikey !== apiKey) {
    throw "Invalid API Key";
  }
  next();
}
// Auth Routes`
// -----------------------------------------------------------------------------
router.route('/signup')
  .post([requireAPIKey, rateLimit.userCreateLimiter, UserController.signup]);
router.route('/signin')
  .post([requireAPIKey, rateLimit.loginLimiter, requireLogin, UserController.signin]);
router.route('/authUrl')
  .post(requireAPIKey, requireAuth, UserController.comparePassword);
  router.route('/search')
    .get(requireAPIKey, requireAuth, UserController.search);
router.route('/banksend')
  .post(requireAPIKey, requireAuth, BankController.inBankSend);
router.route('/send')
  .post(requireAPIKey, requireAuth, BankController.signAndSend);
router.route('/payment')
  .post(requireAPIKey, requireAuth, BankController.preparePayment);
router.route('/transactions')
  .get(requireAPIKey, rateLimit.ledgerLookupLimiter, requireAuth, BankController.getTransactions);
router.route('/nextTransactions')
  .get(requireAPIKey, requireAuth, BankController.loadNextTransactions);
  
  router.route('/delwallet')
  .post([requireAPIKey, requireAuth, WalletController.deleteWallet]);
  router.route('/dest')
    .post(requireAPIKey, requireAuth, WalletController.receiveOnlyDesTag);
  router.route('/addrs')
    .post(requireAPIKey, requireAuth, WalletController.generateRegister);
  router.route('/wallets')
  .get(requireAPIKey, requireAuth, WalletController.receiveAllWallets);
  router.route('/old')
    .get(requireAPIKey, requireAuth, WalletController.findOldAddress);
  router.route('/makeshift')
    .post(requireAPIKey, requireAuth, ShapeshiftController.createShapeshiftTransaction);
  router.route('/getshifts')
    .get(requireAPIKey, requireAuth, ShapeshiftController.getShapeshiftTransactions);
  router.route('/nextShapeShiftTransactions')
    .get(requireAPIKey, requireAuth, ShapeshiftController.loadNextShapeShiftTransactions);
  router.route('/getShapeId')
    .get(requireAPIKey, rateLimit.ledgerLookupLimiter, requireAuth, ShapeshiftController.getShapeshiftTransactionId);

// xxx Routes
// -----------------------------------------------------------------------------
// router.route('/protected')
//   .get(requireAuth, protected);

// Ripple API

module.exports = router;
