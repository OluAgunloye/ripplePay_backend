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
            console.log("hellllow");  
            throw 'error';
            unlock();
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

if ("hello") {
    let x = 1;
} else {
    let x = 3;
}
console.log(x);


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