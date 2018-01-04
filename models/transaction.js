const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const transactionSchema = new Schema({
    //Email has to be dropped at some point. WE DON'T WANT THEIR EMAILS
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
    }
});

exports.Transaction = mongoose.model('transaction', transactionSchema);