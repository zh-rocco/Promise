// 最佳实践

/* 1 */

// bad
Promise.resolve('hello world')
  .then(value => {
    console.log('outer: step 1');

    return Promise.resolve(value)
      .then(value => {
        console.log('inner: step 1');
        return value;
      })
      .then(value => {
        console.log('inner: step 2');
        return value;
      });
  })
  .then(value => {
    console.log('outer: step 2');
    console.log(value);
  });

// good
Promise.resolve('hello world')
  .then(value => {
    console.log('outer: step 1');
    return Promise.resolve(value);
  })
  .then(value => {
    console.log('inner: step 1');
    return value;
  })
  .then(value => {
    console.log('inner: step 2');
    return value;
  })
  .then(value => {
    console.log('outer: step 2');
    console.log(value);
  });

/* 2 */

// bad
Promise.resolve('hello world').then(
  function(value) {
    // success
  },
  function(error) {
    // error
  }
);

// good
Promise.resolve('hello world')
  .then(function(value) {
    //cb
    // success
  })
  .catch(function(error) {
    // error
  });
