const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const shapeShiftTransactionSchema = new Schema({
    //Email has to be dropped at some point. WE DON'T WANT THEIR EMAILS
    shapeShiftAddress: {
        type: String
    },
    userId: {
        type: String
    },
    txnId: {
        type: String
    },
    date: {
        type: Date
    },
    otherParty: {
        type: String
    },
    from: {
        type: String
    },
    to: {
        type: String
    },
    refundAddress: {
        type: String
    },
    orderId: {
        type: String
    }
});

exports.ShapeShiftTransaction = mongoose.model('shapeshifttransaction', shapeShiftTransactionSchema);