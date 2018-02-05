const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const changellyTransactionSchema = new Schema({
    //Email has to be dropped at some point. WE DON'T WANT THEIR EMAILS
    changellyTxnId: {
        type: String
    },
    changellyAddress: {
        type: String
    },
    changellyDestTag: {
        type: String
    },
    userId: {
        type: String
    },
    rippleTxnId: {
        type: String
    },
    date: {
        type: Number
    },
    otherParty: {
        type: String
    },
    toDestTag: {
        type: String
    },
    from: {
        type: Object
    },
    to: {
        type: Object
    },
    fee: {
        type: Number,
    },
    refundAddress: {
        type: String
    },
    refundDestTag: {
        type: String
    },
});

exports.ChangellyTransaction = mongoose.model('changellyTransaction', changellyTransactionSchema);