// throw error

new Promise((resolve, reject) => {
  setTimeout(() => {
    throw new Error('miss error');
  }, 2000);
  throw new Error('miss error');
})
  .then(value => {
    console.log('resolved');
    console.log(value);
  })
  .catch(error => {
    console.log('rejected');
    console.log('mmm:', error);
  });

// 3 秒后，报错终止
// Promise catch 函数内无法捕获到这条错误，因为定时器里的错误是不会传递给 catch 的，会冒泡到外层，比如在全局到话可以通过window.onerror捕获
