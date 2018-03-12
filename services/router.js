const passport = require('passport');

const UserController = require('../controllers/user_controller');
const BankController = require('../controllers/banks_controller');
const WalletController = require('../controllers/wallets_controller');
// const ShapeshiftController = require('../controllers/shapeshift_controller');
const ChangellyController = require('../controllers/changelly_controller');
const PersonalWalletController = require('../controllers/personal_wallet_controller');
const rateLimit = require('./rateLimit');
// the following will take passport and will make some requirements on it
const passportService = require('./passport');

let router = require('express').Router();

let requireAuth = passport.authenticate('jwt', { session: false, failureRedirect: '/v1/forceLogout' });
let requireLogin = passport.authenticate('local', {session: false});

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

function forceLogout(req, res, next) {
  return res.status(401).json({ error: "Session timed out!" });
}

router.route('/forceLogout')
  .get(forceLogout);
// Auth Routes`
// -----------------------------------------------------------------------------
// USER CONTROLLER
router.route('/signup')
  .post([requireAPIKey, rateLimit.userCreateLimiter, UserController.signup]);
router.route('/signin')
  .post([requireAPIKey, rateLimit.loginLimiter, requireLogin, UserController.signin]);
router.route('/authUrl')
  .post(requireAPIKey, requireAuth, UserController.comparePassword);
router.route('/changepass')
  .post(requireAPIKey, rateLimit.changePasswordLimiter, requireAuth, UserController.changePassword);
router.route('/search')
  .get(requireAPIKey, requireAuth, UserController.search);

// BANK CONTROLLER
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
  
// WALLETS CONTROLLER
  router.route('/delwallet')
  .post([requireAPIKey, requireAuth, WalletController.deleteWallet]);
  router.route('/dest')
    .post(requireAPIKey, requireAuth, WalletController.generateDestTag);
  router.route('/addrs')
    .post(requireAPIKey, requireAuth, WalletController.generateRegister);

// PERSONAL WALLET CONTROLLER
  router.route('/personal')
  .post([requireAPIKey, requireAuth, PersonalWalletController.generatePersonalAddress]);
  router.route('/personaltrans')
    .get(requireAPIKey, requireAuth, PersonalWalletController.getPersonalAddressTransactions);
  router.route('/delpersonal')
    .post(requireAPIKey, requireAuth, PersonalWalletController.removePersonalAddress);
  router.route('/personalpayment')
  .post(requireAPIKey, requireAuth, PersonalWalletController.preparePaymentWithPersonalAddress);
  router.route('/sendpersonal')
    .post(requireAPIKey, requireAuth, PersonalWalletController.sendPaymentWithPersonalAddress);
  router.route('/preparePersonalToBank')
    .post(requireAPIKey, requireAuth, PersonalWalletController.prepareTransactionPersonalToBank);

// SHAPESHIFT CONTROLLER
  // router.route('/makeshift')
  //   .post(requireAPIKey, requireAuth, ShapeshiftController.createShapeshiftTransaction);
  // router.route('/getshifts')
  //   .get(requireAPIKey, requireAuth, ShapeshiftController.getShapeshiftTransactions);
  // router.route('/nextShapeShiftTransactions')
  //   .get(requireAPIKey, requireAuth, ShapeshiftController.loadNextShapeShiftTransactions);
  // router.route('/getShapeId')
  //   .get(requireAPIKey, rateLimit.ledgerLookupLimiter, requireAuth, ShapeshiftController.getShapeshiftTransactionId);

  // CHANGELLY CONTROLLER
  router.route('/makechange')
    .post(requireAPIKey, requireAuth, ChangellyController.createChangellyTransaction);
  router.route('/getchanges')
    .get(requireAPIKey, requireAuth, ChangellyController.getChangellyTransactions);
  router.route('/getchangestatus')
    .get(requireAPIKey, requireAuth, ChangellyController.getChangellyTransactionStatus);
  router.route('/nextchanges')
    .get(requireAPIKey, requireAuth, ChangellyController.loadNextChangellyTransactions);
  router.route('/changellyRippleTxnId')
    .get(requireAPIKey, requireAuth, ChangellyController.getChangellyRippleTransactionId);
  router.route('/changellyCoins')
    .get(requireAPIKey, requireAuth, ChangellyController.getCoins);
  router.route('/changellyRate')
    .get(requireAPIKey, requireAuth, ChangellyController.getExchangeRate);
  router.route('/minAmount')
    .get(requireAPIKey, requireAuth, ChangellyController.getMinAmount);


module.exports = router;
