// then 函数内部无 return

Promise.resolve('resolved')
  .then(value => {
    console.log(value);
  })
  .then(value => {
    console.log(value);
  });

// resolved
// undefined
