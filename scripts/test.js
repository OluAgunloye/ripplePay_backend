const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Promise = require('bluebird');
const client = require('redis').createClient();
const { promisify } = require('util');
const lock = promisify(require('redis-lock')(client));

let practice1 = async(function() {
    let unlock = await(lock("my-lock"));
    setTimeout(() => {
        try {
            console.log("salkjfksl");
            return true;
        } catch(e) {
            console.log(e);  
        } finally {
            unlock();
        }
    }, 1);
})

let practice2 = async(function() {
    let unlock = await(lock("my-lock"));
    console.log("yoyoyoyo");
    unlock();
})

practice1();
practice2();


// const fn = async(function(){
//     let y = 1000;
//     while (y < 2000) {
//         y += 1
//         console.log(y);
//     }
//     return false;
// });

// const bn = function(){
//     let y = 3000;
//     while (y < 4000) {
//         y += 1
//         console.log(y);
//     }
//     return Promise.resolve(true);
// };

// bn().then((val) => {
//     console.log(val);
// })

// console.log(fn());
// let y = 1;
// while (y < 1000) {
//     y += 1
//     console.log(y);
// }