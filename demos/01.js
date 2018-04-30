// 先 resolved 再添加 then 函数

const p = new Promise(resolve => {
  resolve();
});

setTimeout(() => {
  p.then(() => {
    console.log('hello world');
  });
}, 3000);

// after 3 seconds: hello world
