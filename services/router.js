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
// Auth Routes`
// -----------------------------------------------------------------------------
router.route('/signup')
  .post([rateLimit.userCreateLimiter, UserController.signup]);
router.route('/signin')
  .post([rateLimit.loginLimiter, requireLogin, UserController.signin]);
router.route('/authUrl')
  .post(requireAuth, UserController.comparePassword);
  router.route('/search')
    .get(requireAuth, UserController.search);
router.route('/banksend')
  .post(requireAuth, BankController.inBankSend);
router.route('/send')
  .post(requireAuth, BankController.signAndSend);
router.route('/payment')
  .post(requireAuth, BankController.preparePayment);
router.route('/transactions')
  .get(rateLimit.ledgerLookupLimiter, requireAuth, BankController.getTransactions);
router.route('/nextTransactions')
  .get(requireAuth, BankController.loadNextTransactions);
  
  router.route('/delwallet')
  .post([requireAuth, WalletController.deleteWallet]);
  router.route('/delRegister')
  .post(requireAuth, WalletController.removeCashRegister);
  router.route('/dest')
  .post(requireAuth, WalletController.receiveOnlyDesTag);
  router.route('/addrs')
  .post(requireAuth, WalletController.generateRegister);
  router.route('/wallets')
  .get(requireAuth, WalletController.receiveAllWallets);
  router.route('/old')
  .get(requireAuth, WalletController.findOldAddress);
  router.route('/makeshift')
  .post(requireAuth, ShapeshiftController.createShapeshiftTransaction);
  router.route('/getshifts')
  .get(requireAuth, ShapeshiftController.getShapeshiftTransactions);
  router.route('/nextShapeShiftTransactions')
    .get(requireAuth, ShapeshiftController.loadNextShapeShiftTransactions);
  router.route('/getShapeId')
    .get(rateLimit.ledgerLookupLimiter, requireAuth, ShapeshiftController.getShapeshiftTransactionId);

// xxx Routes
// -----------------------------------------------------------------------------
// router.route('/protected')
//   .get(requireAuth, protected);

// Ripple API

module.exports = router;
