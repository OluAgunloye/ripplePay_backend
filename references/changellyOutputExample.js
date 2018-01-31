// EXAMPLE OUTPUT:
// getStatus {
//     jsonrpc: '2.0',
//     id: '1c30c18a-1d3b-40d0-ba79-86fd971ad991',
//     result: 'overdue'
// }
// getMinAmount {
//     jsonrpc: '2.0',
//     id: 'a70b113f-e621-4172-bb28-7d790b84d57c',
//     result: '0.04108227648787498'
// }
// getCurrencies {
//     jsonrpc: '2.0',
//     id: 'e2d168b1-66e3-40a1-9455-8fd8b0c5355a',
//     result:
//     ['btc',
//         'eth',
//         'xem',
//         'lsk',
//         'xmr',
//         'game',
//         'zec',
//         'nlg',
//         'strat',
//         'ltc',
//         'bcn',
//         'xrp',
//         'doge',
//         'nxt',
//         'dash',
//         'nav',
//         'pot',
//         'waves',
//         'sys',
//         'str',
//         'bch',
//         'xvg',
//         'btg',
//         'dgb']
// }
// getTransactions {
//     jsonrpc: '2.0',
//         id: '3b4f3e8d-47bc-4724-a80a-055a7888c9ed',
//         result: []
// }
// getExchangeAmount {
//     jsonrpc: '2.0',
//         id: '62e5576f-582c-459b-a67e-f762318c133d',
//         result: '9.22166'
// }
// createTransaction {
//     jsonrpc: '2.0',
//         id: '746c4ce5-9ba1-42d5-894e-048646557c77',
//         result:
//     {
//         id: '9f9c6f19680c',
//         apiExtraFee: '0',
//         changellyFee: '0.5',
//         payinExtraId: '142608',
//         refundAddress: 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi',
//         status: 'new',
//         currencyFrom: 'xrp',
//         currencyTo: 'eth',
//         amountTo: 0,
//         payinAddress: 'rPujGTiw6nKmMvAiUT6UjpFxT9QrDn9kJP',
//         payoutAddress: '0xA800BaAA96f2DF6F049E460a46371B515ae7Fd7C',
//         createdAt: '2018-01-31T08:04:45.000Z'
//     }

// {
//     id: '9a8867b92934',
//     apiExtraFee: '0',
//     changellyFee: '0.5',
//     payinExtraId: null,
//     refundAddress: '0xA800BaAA96f2DF6F049E460a46371B515ae7Fd7C',
//     status: 'new',
//     currencyFrom: 'eth',
//     currencyTo: 'xrp',
//     amountTo: 0,
//     payinAddress: '0xfd975c905bd4aa2557692efa63f5cdb2584d29cd',
//     payoutAddress: 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi',
//     createdAt: '2018-01-31T09:20:11.000Z'
// } 
// }
// the fee is calculated from the 'from' currency in this case XRP