const asynchronous = require('asyncawait/async');
const await = require('asyncawait/await');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();
const { Money } = require('../models/moneyStorage');
const User = require('../models/user');
const UserMethods = require('../models/methods/user');
const PersonalWalletValidation = require('../validations/personal_wallets_validation');

exports.generatePersonalAddress = asynchronous(function (req, res, next) {
    const user = req.user;

    const validationError = PersonalWalletValidation.generatePersonalAddressValidations(user);
    if (validationError) {
        return res.status(422).json({ error: validationError });
    }

    const personalAddressObject = await(rippledServer.generateAddress());
    user.personalAddress = personalAddressObject.address;
    user.save(function (err) {
        if (err) {
            return next(err);
        }
    });
    return res.json({ personalAddress: personalAddressObject.address, secret: personalAddressObject.secret })
});

exports.getPersonalAddressTransactions = asynchronous(function (req, res, next) {
    const user = req.user;
    const limit = req.query[0];
    if (!user.personalAddress) {
        return res.json({ message: "user does not have a personal address!" });
    }
    const personalAddressBalance = await(rippledServer.getBalance(user.personalAddress));

    const validationError = PersonalWalletValidation.getPersonalAddressTransactionsValidations(limit, personalAddressBalance);
    if (validationError) {
        return res.status(422).json({ error: validationError });
    }

    const personalAddressTransactions = await(rippledServer.getTransactions(user.personalAddress, limit));
    res.json({ 
        personalAddress: user.personalAddress, 
        personalAddressBalance, 
        personalAddressTransactions 
    });
});

exports.removePersonalAddress = asynchronous(function (req, res, next) {
    const user = req.user;

    const validationError = PersonalWalletValidation.removePersonalAddressValidations(user);
    if (validationError) {
        return res.status(422).json({ error: validationError });
    }

    user.personalAddress = null;
    user.save(function (err) {
        if (err) {
            return next(err);
        }
        res.json({ message: "Sucessfully removed personal address from ripplePay" });
    });
});

exports.preparePaymentWithPersonalAddress = asynchronous(function (req, res, next) {
    const user = req.user;
    const userId = user._id;
    let { amount, fromAddress, toAddress, toDesTag } = req.body;
    const personalBalance = await(rippledServer.getBalance(fromAddress));
    const validationErrors = PersonalWalletValidation.preparePaymentWithPersonalAddressValidations(amount, fromAddress, toAddress, toDesTag, personalBalance);
    if (validationErrors.length > 0) {
        return res.status(422).json({ error: validationErrors })
    }

    amount = parseFloat(amount);

    const txnInfo = await(rippledServer.prepareTransaction(fromAddress, toAddress, amount, null, toDesTag, userId));
    const fee = parseFloat(txnInfo.instructions.fee);
    return res.json({ fee });
});

exports.sendPaymentWithPersonalAddress = asynchronous(function (req, res, next) {
    let { fromAddress, secret, amount } = req.body;
    const existingUser = req.user;
    const userId = existingUser._id;
    const registerAddress = fromAddress;

    const validationErrors = PersonalWalletValidation.sendPaymentWithPersonalAddressValidations(amount, registerAddress, secret);
    if (validationErrors.length > 0) {
        return res.status(422).json({ error: validationErrors })
    }

    amount = parseFloat(amount);
    // Do a validation check here to check if the person has the amount + 0.02 fee to pay and if not give error
    const result = await(rippledServer.signAndSend(fromAddress, secret, userId));
    
    if (result && result.resultCode === "tesSUCCESS") {
        await(rippledServer.autoPayFee(fromAddress, secret));
    }

    if (result) {
        console.log(result);
        res.json({ message: result.resultCode });
    }
    else {
        res.json({ message: "Transaction Failed" });
    }
});

exports.prepareTransactionPersonalToBank = asynchronous(function (req, res, next) {
    let { amount, fromAddress, toScreenName } = req.body;
    const sender = req.user;
    const senderId = sender._id;
    
    const receiver = await(UserMethods.findByScreenName(toScreenName));
    if (!receiver) {
      return res.status(422).json({ error: 'no existing user with this screen name'});  
    }
    const receiverWallets = await(UserMethods.getWallets(receiver._id, receiver.cashRegister));

    const validationErrors = PersonalWalletValidation.prepareTransactionPersonalToBankValidations(toScreenName, fromAddress, amount, sender, receiver, receiverWallets);
    if (validationErrors.length > 0) {
        return res.status(422).json({ error: validationErrors })
    }

    amount = parseFloat(amount);

    const toDesTag = receiverWallets[receiverWallets.length - 1];
    const toAddress = receiver.cashRegister;
    const txnInfo = await(rippledServer.prepareTransaction(fromAddress, toAddress, amount, null, toDesTag, senderId));
    const fee = parseFloat(txnInfo.instructions.fee);
    res.json({
        fee,
        toAddress,
        toDesTag
    });
});