const asynchronous = require('asyncawait/async');
const await = require('asyncawait/await');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();
const { Money } = require('../models/moneyStorage');

exports.generatePersonalAddress = asynchronous(function (req, res, next) {
    const personalAddressObject = await(rippledServer.generateAddress());
    const user = req.user;
    if (user.personalAddress) {
        return res.json({ message: "user already has a personal address"})
    }
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
    if (!user.personalAddress) {
        return res.json({ message: "user does not have a personal address!" });
    }
    const personalAddressTransactions = await(rippledServer.getTransactions(user.personalAddress));
    const personalAddressBalance = await(rippledServer.getBalance(user.personalAddress));
    res.json({ 
        personalAddress: user.personalAddress, 
        personalAddressBalance, 
        personalAddressTransactions 
    });
});

exports.removePersonalAddress = asynchronous(function (req, res, next) {
    const user = req.user;
    if (!user.personalAddress) {
        res.json({ message: "user already has no personal address" });
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
    const { amount, fromAddress, toAddress, sourceTag, toDesTag } = req.body;
    if (amount <= 0) {
        return res.json({ message: "Cant send 0 or less XRP" });
    }

    const txnInfo = await(rippledServer.getTransactionInfo(fromAddress, toAddress, amount, sourceTag, toDesTag, userId));
    const fee = txnInfo.instructions.fee;
    res.json({
        fee: txnInfo.instructions.fee
    });
});

exports.sendPaymentWithPersonalAddress = asynchronous(function (req, res, next) {
    const { fromAddress, secret, amount } = req.body;
    const existingUser = req.user;
    const userId = existingUser._id;

    if (amount <= 0) {
        return res.json({ message: "Cant send 0 or less XRP" });
    }

    const result = await(rippledServer.signAndSend(fromAddress, secret, userId));
    if (result) {
        console.log(result);
        res.json({ message: result.resultCode });
    }
    else {
        res.json({ message: "Transaction Failed" });
    }
});
