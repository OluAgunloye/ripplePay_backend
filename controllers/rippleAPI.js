// API to interact with Rippled Server
const { RippleAPI } = require('ripple-lib');
const { addresses, bank } = require('../controllers/addresses');

class Rippled {
  constructor(){
      this.api = new RippleAPI({
        server: 'wss://s2.ripple.com/' // Public rippled server hosted by Ripple, Inc.
        //Need to change this to a private one later.
      });
      this.api.on('error', (errorCode, errorMessage) => {
        console.log(errorCode + ': ' + errorMessage);
      });
      this.api.on('connected', () => {
        console.log('connected');
      });
      this.api.on('disconnected', (code) => {
        console.log('disconnected, code:', code);
      });
      this.connect = this.connect.bind(this);

    }

    getBalance(address) {
      this.api.getBalances(address).then((info) => console.log(info));
    }

    getSuccessfulTransactions(address) {
      this.api.getTransactions(address, {excludeFailures: true, types: ["payment"]}).then((info) => info.map((i) => console.log(i.specification)));
    }

    getAllTransactions(address) {
      this.api.getTransactions(address).then((info) => console.log(info.map((s) => {
        return s.specification.destination;
      }))).catch(error => {
        console.log("Error", error);
      });
    }

    thePayment(fromAddress, toAddress, desTag, sourceTag, value){
      let payment;
      if (desTag) {
        payment = {
          "source": {
            "address": fromAddress,
            "tag": sourceTag,
            "maxAmount": {
              "value": `${value}`,
              "currency": "XRP"
            }
          },
          "destination": {
            "address": toAddress,
            "tag": desTag,
            "amount": {
              "value": `${value}`,
              "currency": "XRP"
            }
          }
        };
      } else {
        payment = {
          "source": {
            "address": fromAddress,
            "tag": sourceTag,
            "maxAmount": {
              "value": `${value}`,
              "currency": "XRP"
            }
          },
          "destination": {
            "address": toAddress,
            "amount": {
              "value": `${value}`,
              "currency": "XRP"
            }
          }
        }
      }
      return payment;
    }

    signAndSend(fromAddress, toAddress, secret, value, paths, sourceTag, desTag = false) {
      let payment = this.thePayment(fromAddress, toAddress, desTag, sourceTag, value, paths);
      // console.log(paths);
      this.api.preparePayment(fromAddress, payment).then((orderinfo) => {
        let jstring = this.api.sign(orderinfo.txJSON, secret);
        let signedTransact = jstring.signedTransaction;
        this.api.submit(signedTransact).then((result) => console.log(result));
      }).catch(error => console.log(error));
    }

    getOtherPartyAddress(address, idx) {
      this.api.getTransactions(address).then((info) => {
      Object.keys(info[idx].outcome.balanceChanges).forEach((addr) => {
        if ( address !== addr )
        {
          console.log(addr);
          return addr;
        }
        });
      }).catch(error => {
          console.log("Error", error);
        });
    }

    // current fee that ripple charges
    getFee() {
      this.api.getFee().then((info) => console.log(info));
    }

    getAccountInfo(address) {
      this.api.getAccountInfo(address).then((info) => console.log(info));
    }

    // not for production use, just use what is in the console.log
    getTransactionId(address, idx) {
      this.api.getTransactions(address).then((info) => console.log(info[idx].id)).catch(error => {
        console.log("Error", error);
      });
    }

    // not for production use, just use what is in the console.log
    getDestinationTag(address, idx) {
      this.api.getTransactions(address).then((info) => console.log(info[idx].specification.destination.tag)).catch(error => {
        console.log("Error", error);
      });
    }

    // not for production use, just use what is in the console.log
    // The following will get the balance change per each transaction.
    balanceChange(address, idx) {
      this.api.getTransactions(address).then((info) => console.log(info[idx].outcome.balanceChanges[address][0].value)).catch(error => {
        console.log("Error", error);
      });
    }

    connect(){
      return this.api.connect();
    }
}
const maddress = 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi';
const trustline = {
  "currency": "BTC",
  "counterparty": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
  "limit": "100",
  "qualityIn": 0.91,
  "qualityOut": 0.87,
  "ripplingDisabled": true,
  "frozen": false,
  "memos": [
    {
      "type": "test",
      "format": "plain/text",
      "data": "texted data"
    }
  ]
};
const order ={
  "direction": "buy",
  "quantity": {
    "currency": "USD",
    "counterparty": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
    "value": "1"
  },
  "totalPrice": {
    "currency": "XRP",
    "value": "6",
  },
  "passive": true,
  "fillOrKill": true
};

const pathfind = {
  "source": {
    "address": "rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi"
  },
  "destination": {
    "address": "rPxkAQQB65foPBg2Y84xyEHCieXv5qCjTY",
    "amount": {
      "currency": "BTC",
      // "counterparty": "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL",
      "value": "0.0002"
    }
  }
};

const orderbook = {
  "base": {
    "currency": "XRP"
    // "counterparty": "rhotcWYdfn6qxhVMbPKGDF3XCKqwXar5J4"
  },
  "counter": {
    "currency": "USD",
    "counterparty": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"
  }
};

module.exports = Rippled;
