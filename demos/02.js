// then 函数的“穿透”现象

Promise.resolve('resolved.')
  .then()
  .then()
  .then(value => {
    console.log(value);
  });

// resolved.
