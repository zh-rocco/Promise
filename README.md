# Promise

## 目录

* [**实现**](#介绍)
* [**注释**](#注释)
* [**测试**](#测试)
* [**参考**](#参考)

## 实现

### 构造函数

```js
function Promise(resolver) {
  var self = this;
  self.data = undefined; // Promise 的值
  self.status = 'pending'; // Promise 当前的状态
  self.callbacks = []; // Promise 时的回调函数集，格式：[{onResolved: Function, onRejected: Function]

  // setTimeout 用于异步执行，模拟 micro Task
  function resolve(value) {
    if (self.status !== 'pending') {
      return;
    }

    self.status = 'resolved';
    self.data = value;

    for (var i = 0; i < self.callbacks.length; i++) {
      self.callbacks[i].onResolved(value);
    }
  }

  // setTimeout 用于异步执行，模拟 micro Task
  function reject(reason) {
    if (self.status !== 'pending') {
      return;
    }

    self.status = 'rejected';
    self.data = reason;

    for (var i = 0; i < self.callbacks.length; i++) {
      self.callbacks[i].onRejected(reason);
    }
  }

  // 执行 resolver 的过程中有可能出错，所以用 try/catch 包起来，出错后以 catch 到的值 reject 掉这个 Promise
  try {
    resolver(resolve, reject);
  } catch (reason) {
    reject(reason);
  }
}
```

### then 方法

```js
Promise.prototype.then = function(onResolved, onRejected) {
  // 根据标准，如果 then 的参数不是 function，则我们需要忽略它，此处以如下方式处理
  // return value/reason 保证 then/catch 实参留空时，值可以“穿透”到后面
  onResolved =
    typeof onResolved === 'function'
      ? onResolved
      : function(v) {
          return v;
        };
  onRejected =
    typeof onRejected === 'function'
      ? onRejected
      : function(r) {
          throw r;
        };

  var self = this;
  var promise2;

  // 当前 promise 状态已确定，且为 resolved
  if (self.status === 'resolved') {
    return (promise2 = new Promise(function(resolve, reject) {
      try {
        // 调用 onResolved
        var x = onResolved(self.data);
        resolvePromise(promise2, x, resolve, reject);
      } catch (e) {
        reject(e);
      }
    }));
  }

  // 当前 promise 状态已确定，且为 rejected
  if (self.status === 'rejected') {
    return (promise2 = new Promise(function(resolve, reject) {
      try {
        // 调用 onRejected
        var x = onRejected(self.data);
        resolvePromise(promise2, x, resolve, reject);
      } catch (e) {
        reject(e);
      }
    }));
  }

  // 当前 promise 状态不确定

  // 如果当前的 Promise 还处于 pending 状态，我们并不能确定调用 onResolved 还是 onRejected，
  // 只能等到 Promise 的状态确定后，才能确实如何处理。
  // 所以我们需要把我们的两种情况的处理逻辑做为 callback 放入 promise1(此处即 this/self)的回调数组里
  if (self.status === 'pending') {
    return (promise2 = new Promise(function(resolve, reject) {
      self.callbacks.push({
        onResolved: function(value) {
          try {
            var x = onResolved(value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        },
        onRejected: function(reason) {
          try {
            var x = onRejected(reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }
      });
    }));
  }
};
```

## 注释

查看 index.js 文件

## 测试

```bash
npm i promises-aplus-tests -g

promises-aplus-tests ./index.js
```

## 参考

* [剖析 Promise 内部结构，一步一步实现一个完整的、能通过所有 Test case 的 Promise 类](https://github.com/xieranmaya/blog/issues/3)

- [Promises/A+](https://promisesaplus.com/)
