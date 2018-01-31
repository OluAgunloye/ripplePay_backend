const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const changellyTransactionSchema = new Schema({
    //Email has to be dropped at some point. WE DON'T WANT THEIR EMAILS
    changellyAddress: {
        type: String
    },
    changellyDestTag: {
        type: String
    },
    userId: {
        type: String
    },
    txnId: {
        type: String
    },
    date: {
        type: Number
    },
    otherParty: {
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
    orderId: {
        type: String
    }
});

exports.ShapeShiftTransaction = mongoose.model('shapeshifttransaction', shapeShiftTransactionSchema);