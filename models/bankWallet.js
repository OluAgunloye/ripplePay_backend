const mongoose = require('mongoose');
const Config = require('../config_enums');
const Schema = mongoose.Schema;
// bankWalletId is the combination of address + destTag and must be unique per person.
const validateDestTag = (destTag) => {
  if (!isNaN(parseInt(destTag)) && destTag >= Config.MIN_DEST_TAG && destTag <= Config.MAX_DEST_TAG) {
    return true;
  }
  return false;
};

function validateUnique () {
  return;
}

const bankWalletSchema = new Schema({
  userId: {
    type: String,
  },
  bankWalletId: {
    type: String,
    unique: true,
    required: 'Bank Wallet Id is required',
    validate: [validateUnique],
  },
  address: {
    type: String,
  },
  destTag: {
    type: Number,
    validate: [validateDestTag, 'Dest Tag must be between 1 and 4294967294'],
  },
  createdAt: {
    type: Number,
  },
});

exports.BankWallet = mongoose.model('bankwallet', bankWalletSchema);