const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const async = require('async');

exports.BANK_NAME = "ripplePay";

let cashRegisterSchema = new Schema({
  address: {
    type: String
  },
  balance: {
    type: String
  }
});

let usedWalletSchema = new Schema ({
  wallet: {
    type: String
  }
});

let moneySchema = new Schema ({
  KEY_TWO: {
    type: String,
  },
  cost: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  }
});

exports.CashRegister = mongoose.model('cashRegister', cashRegisterSchema);
exports.UsedWallet = mongoose.model('usedWallet', usedWalletSchema );
exports.Money = mongoose.model('money', moneySchema);
