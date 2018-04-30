// then 函数内部有 return

Promise.resolve('resolved')
  .then(value => {
    console.log(value);
    return 'From the first then func.';
  })
  .then(value => {
    console.log(value);
  });

// resolved
// From the first then func.
