const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const transactionSchema = new Schema({
    //Email has to be dropped at some point. WE DON'T WANT THEIR EMAILS
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