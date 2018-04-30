const p1 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('p1');
  }, 3000);
});

const p2 = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject('p2');
  }, 1000);
});

const p3 = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject('p3');
  }, 2000);
});

Promise.all([p1, p2, p3])
  .then(value => {
    console.log(value);
  })
  .catch(error => {
    console.log(error);
  });

// p2
