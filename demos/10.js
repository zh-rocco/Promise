new Promise((resolve, reject) => {
  reject('miss error');
})
  .then(
    value => {
      console.log(value);
      return value;
    },
    error => {
      console.log('then 2:', error);
      return error;
    }
  )
  .catch(error => {
    console.log('catch:', error);
    return error;
  });
