// then 函数内部有 return，且 return 一个 Promise

/* 1. return 的 promise 状态未定 */
Promise.resolve('resolved')
  .then(value => {
    console.log(value);
    return new Promise(() => {});
  })
  .then(value => {
    console.log(value);
  });

// resolved

/* 2. return 的 promise 状态确定 */
Promise.resolve('resolved')
  .then(value => {
    console.log(value);
    return new Promise(resolve => {
      resolve('From the first then.');
    });
  })
  .then(value => {
    console.log(value);
  });

// resolved
// From the first then.

/* 3. return 的 promise 状态延时确定 */
Promise.resolve('resolved')
  .then(value => {
    console.log(value);
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('From the first then.');
      }, 3000);
    });
  })
  .then(value => {
    console.log(value);
  });

// resolved
// after 3 seconds: From the first then.
