// We can use our URL's to the backend and then make promises that will start controller actions.
// Go to authenticationController next.

const passport = require('passport');

const AuthenticationController = require('../controllers/authentication_controller');
const BankController = require('../controllers/banks_controller');
const WalletController = require('../controllers/wallets_controller');
const ShapeshiftController = require('../controllers/shapeshift_controller');
// the following will take passport and will make some requirements on it
const passportService = require('./passport');

let requireAuth = passport.authenticate('jwt', {session: false});
let requireLogin = passport.authenticate('local', {session: false});
let router = require('express').Router();
// Auth Routes`
// -----------------------------------------------------------------------------
router.route('/signup')
  .post(AuthenticationController.signup);
router.route('/signin')
  .post([requireLogin, AuthenticationController.signin]);
router.route('/authUrl')
  .post(requireAuth, AuthenticationController.comparePassword);
router.route('/banksend')
  .post(requireAuth, BankController.inBankSend);
router.route('/send')
  .post(requireAuth, BankController.sendMoney);
router.route('/search')
  .get(requireAuth, AuthenticationController.search);
router.route('/transactions')
  .get(requireAuth, BankController.getTransactions);

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
router.route('/getShapeId')
  .get(requireAuth, ShapeshiftController.getShapeshiftTransactionId);

// xxx Routes
// -----------------------------------------------------------------------------
// router.route('/protected')
//   .get(requireAuth, protected);

// Ripple API

module.exports = router;
