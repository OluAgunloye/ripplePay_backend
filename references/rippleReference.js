   // getOtherPartyAddress(address, idx) {
    //   this.api.getTransactions(address).then((info) => {
    //   Object.keys(info[idx].outcome.balanceChanges).forEach((addr) => {
    //     if ( address !== addr )
    //     {
    //       console.log(addr);
    //       return addr;
    //     }
    //     });
    //   }).catch(error => {
    //       console.log("Error", error);
    //     });
    // }

    // // current fee that ripple charges
    // getFee() {
    //   this.api.getFee().then((info) => console.log(info));
    // }

    // getAccountInfo(address) {
    //   this.api.getAccountInfo(address).then((info) => console.log(info));
    // }

    // // not for production use, just use what is in the console.log
    // getTransactionId(address, idx) {
    //   this.api.getTransactions(address).then((info) => console.log(info[idx].id)).catch(error => {
    //     console.log("Error", error);
    //   });
    // }

    // // not for production use, just use what is in the console.log
    // getDestinationTag(address, idx) {
    //   this.api.getTransactions(address).then((info) => console.log(info[idx].specification.destination.tag)).catch(error => {
    //     console.log("Error", error);
    //   });
    // }

    // // not for production use, just use what is in the console.log
    // // The following will get the balance change per each transaction.
    // balanceChange(address, idx) {
    //   this.api.getTransactions(address).then((info) => console.log(info[idx].outcome.balanceChanges[address][0].value)).catch(error => {
    //     console.log("Error", error);
    //   });
    // }

    // connect(){
    //   return this.api.connect();
    // }
// })

// const maddress = 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi';
// const trustline = {
//   "currency": "BTC",
//   "counterparty": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
//   "limit": "100",
//   "qualityIn": 0.91,
//   "qualityOut": 0.87,
//   "ripplingDisabled": true,
//   "frozen": false,
//   "memos": [
//     {
//       "type": "test",
//       "format": "plain/text",
//       "data": "texted data"
//     }
//   ]
// };
// const order ={
//   "direction": "buy",
//   "quantity": {
//     "currency": "USD",
//     "counterparty": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
//     "value": "1"
//   },
//   "totalPrice": {
//     "currency": "XRP",
//     "value": "6",
//   },
//   "passive": true,
//   "fillOrKill": true
// };

// const pathfind = {
//   "source": {
//     "address": "rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi"
//   },
//   "destination": {
//     "address": "rPxkAQQB65foPBg2Y84xyEHCieXv5qCjTY",
//     "amount": {
//       "currency": "BTC",
//       // "counterparty": "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL",
//       "value": "0.0002"
//     }
//   }
// };

// const orderbook = {
//   "base": {
//     "currency": "XRP"
//     // "counterparty": "rhotcWYdfn6qxhVMbPKGDF3XCKqwXar5J4"
//   },
//   "counter": {
//     "currency": "USD",
//     "counterparty": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq"
//   }
// };


    // getAllTransactions(address) {
    //   this.api.getTransactions(address).then((info) => console.log(info.map((s) => {
    //     return s.specification.destination;
    //   }))).catch(error => {
    //     console.log("Error", error);
    //   });
    // }

// module.exports = Rippled;