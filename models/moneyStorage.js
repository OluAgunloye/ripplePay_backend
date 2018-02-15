const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const Schema = mongoose.Schema;

let cashRegisterSchema = new Schema({
  address: {
    type: String
  },
  balance: {
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
exports.Money = mongoose.model('money', moneySchema);
