const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const transactionSchema = new Schema({
    txnId: {
        type: String,
        default: "RipplePay Transaction"
    },
    userId: {
        type: String
    },
    tag: {
        type: Number,
        default: -1
    },
    date: {
        type: Number
    },
    amount: {
        type: Number
    },
    otherParty: {
        type: String
    },
    otherPartyTag: {
        type: Number
    }
});

exports.Transaction = mongoose.model('transaction', transactionSchema);