// then 函数状态确定

Promise.resolve('resolved')
  .then(value => {
    console.log(value);

    (function() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve('Delay to resolve');
        }, 3000);
      });
    })();

    return 'Immediately resolve';
  })
  .then(value => {
    console.log(value);
  });

// resolved
// after 3 seconds: From the first then.
