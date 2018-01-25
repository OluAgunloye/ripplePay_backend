const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const transactionSchema = new Schema({
    txnId: {
        type: String
    },
    userId: {
        type: String
    },
    tag: {
        type: Number
    },
    date: {
        type: Date
    },
    otherParty: {
        type: String
    },
});

exports.Transaction = mongoose.model('transaction', transactionSchema);
