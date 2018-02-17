const async = require('asyncawait/async');
const await = require('asyncawait/await');
const { CashRegister } = require('../moneyStorage');
const Config = require('../../config_enums');

exports.getMinBalanceCashRegister = async(function () {
    const cashRegisters = await(CashRegister.find().sort({ balance: 1 }));
    const minBalanceRegister = cashRegisters[0].address;
    return minBalanceRegister;
});