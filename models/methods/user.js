const async = require('asyncawait/async');
const await = require('asyncawait/await');
const User = require('../user');
const { Transaction } = require('../transaction');
const { ChangellyTransaction } = require('../changellyTransaction');
const { BankWallet } = require('../bankWallet');
const Config = require('../../config_enums');

exports.getTransactions = async(function (userId) {
    const userTransactions = await(Transaction.find({ userId }, { userId: 0 }).sort({ date: -1 }).limit(Config.TXN_LIMIT));
    return userTransactions;
});

exports.getChangellyTransactions = async(function (userId) {
    const userChangellyTransactions = await(ChangellyTransaction.find({ userId }, { userId: 0 }).sort({ date: -1 }).limit(Config.TXN_LIMIT));
    return userChangellyTransactions;
});

exports.getTransactionsBeforeDate = async(function(maxDate) {
    const transactions = await(Transaction.find({ userId: userId, date: { '$lte': maxDate } }, { userId: 0 }).sort({ date: -1 }).limit(Config.TXN_LIMIT+1));
    // remove the first since that will have already been counted.
    transactions = transactions.slice(1);
    return transactions;
});

exports.getChangellyTransactionsBeforeDate = async(function(maxDate) {
    const changellyTransactions = await(ChangellyTransaction.find({ userId: userId, date: { '$lte': maxDate } }, { userId: 0 }).sort({ date: -1 }).limit(Config.TXN_LIMIT+1));
    // remove the first since that will have already been counted.
    changellyTransactions = changellyTransactions.slice(1);
    return changellyTransactions;
});

exports.getWallets = async(function(userId, cashRegister) {
    let userWallets = (await(BankWallet.find({ userId: userId, address: cashRegister }, { destTag: 1 }))).map((doc) => doc.destTag);
    return userWallets;
});


exports.increaseBalance = async(function(userId, amount) {
    const updatedUser = await(User.findOneAndUpdate({ _id: userId }, { '$inc': { balance: amount } }, { returnNewDocument: true }));
    return updatedUser;
});

exports.decreaseBalance = async(function(userId, amount) {
    const updatedUser = await(User.findOneAndUpdate({ _id: userId }, { '$inc': { balance: -amount } }, { returnNewDocument: true }));
    return updatedUser;
});

exports.findByScreenName = async(function(screenName) {
    const user = User.findOne({ screenName });
    return user;
});

exports.removeWallet = async(function(bankWalletId) {
    await(BankWallet.findOneAndRemove({ bankWalletId }));
});

exports.searchUser = async(function(searchString, currentUserScreenName) {
    let regex = new RegExp(`^${searchString}\\w*$`, 'i');
    let users = await(User.find({ 'screenName': { '$regex': regex, '$ne': currentUserScreenName } }, { 'screenName': 1 }));
    return users.map((user) => user.screenName);
});
