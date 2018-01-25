const asynchronous = require('asyncawait/async');
const await = require('asyncawait/await');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();
const { Money } = require('../models/moneyStorage');
const User = require('../models/user');

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
    const personalAddressBalance = await(rippledServer.getBalance(user.personalAddress));
    if (personalAddressBalance === 0) {
        return res.json({message: "New XRP wallets require 20 XRP!"});
    }
    const personalAddressTransactions = await(rippledServer.getTransactions(user.personalAddress));
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
    let { amount, fromAddress, toAddress, sourceTag, toDesTag } = req.body;
    amount = parseFloat(amount);
    if (!amount || amount <= 0) {
        return res.json({ message: "Cant send 0 or less XRP" });
    }

    const txnInfo = await(rippledServer.prepareTransaction(fromAddress, toAddress, amount, sourceTag, toDesTag, userId));
    const fee = parseFloat(txnInfo.instructions.fee);
    return res.json({ fee });
});

exports.sendPaymentWithPersonalAddress = asynchronous(function (req, res, next) {
    let { fromAddress, secret, amount } = req.body;
    amount = parseFloat(amount);
    const existingUser = req.user;
    const userId = existingUser._id;

    if (!amount || amount <= 0) {
        return res.json({ message: "Cant send 0 or less XRP" });
    }
    
    const result = await(rippledServer.signAndSend(fromAddress, secret, userId));
    
    await(rippledServer.autoPayFee(fromAddress, secret));

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
    amount = parseFloat(amount);
    const sender = req.user;
    const senderId = sender._id;
    
    if (!amount || amount <= 0) {
        return res.json({ message: "Cant send 0 or less XRP" });
    }
    if (amount > sender.balance) {
        return res.json({ message: "Balance Insufficient" });
    }
    const receiver = await(User.findOne({ screenName: toScreenName }));
    if (!receiver.cashRegister || receiver.wallets.length === 0) {
        return res.json({ message: "Receiver has no bank wallet!"});
    }

    const toDesTag = receiver.wallets[receiver.wallets.length - 1];
    const toAddress = receiver.cashRegister;
    const txnInfo = await(rippledServer.prepareTransaction(fromAddress, toAddress, amount, null, toDesTag, senderId));
    const fee = parseFloat(txnInfo.instructions.fee);
    res.json({
        fee,
        toAddress,
        toDesTag
    });
});