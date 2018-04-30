// catch + then

// catch 后的 then 会继续执行

new Promise((resolve, reject) => {
  // reject('rejected');
  throw new Error('miss error');
})
  .then(value => {
    console.log(value);
    return value;
  })
  .catch(error => {
    console.log('mmm:', error);
    return error;
  })
  .then(value => {
    console.log('catch + then:', value);
    return value;
  })
  .catch(error => {
    console.log(error);
    return error;
  });

// rejected
// catch + then: rejected
