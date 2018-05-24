# Promise

## 目录

* [**入门**](#入门)
* [**优势**](#优势)
* [**特性**](#特性)
* [**示例**](#示例)
* [**最佳实践**](#最佳实践)
* [**实现**](#实现)
* [**注释**](#注释)
* [**测试**](#测试)
* [**参考**](#参考)

## 入门

* [JavaScript Promise：简介 - Google](https://developers.google.com/web/fundamentals/primers/promises)
* [Promise 对象 - ECMAScript 6 入门](http://es6.ruanyifeng.com/#docs/promise)

## 优势

### 避免回调地狱

callback:
![callback hell](https://github.com/zh-rocco/Promise/blob/master/images/callback-hell.png)

promise:
![promise](https://github.com/zh-rocco/Promise/blob/master/images/promise.png)

### 转移控制权

* callback 的控制权交给了调用方
* promise 的控制权属于使用者

例子：

* **callback：** 小明给女神表白，说：“你要是不答应我，我就跳楼（传入回调）”，女神听了后不假思索地拒绝了小明，君子一言，驷马难追，小明遂跳楼（执行回调），卒。

* **promise** 小刚也给女神表白（心想：女神不答应的话我也去跳楼），等待女神回复（pending），女神听了后不假思索地拒绝了小刚（状态变更为 reject），小刚突然想起美女小红，放弃自杀念头，生还（执行回调）。

Promise 的威力！ :see_no_evil:

## 特性

1.  `new Promise( ... )` 返回一个 Promise 实例，可以被链式调用，即 `thenable`。
2.  每次调用 `then` 函数时都会默认返回一个 **新** 的 `Promise` 实例，即可以继续链式调用。
3.  `then` 函数内部可以显示 `return` 一个新的 `Promise` 实例，或者其他值。
    * `then` 函数内部显示返回其他值时，会立即执行下一级的 `then` 函数。
    * `then` 函数内部显示返回一个新的 Promise 实例时，下一级的 `then` 函数会在新的 `Promise` 实例状态确认后被调用。

## 示例

### throw new Error()

1.

```javascript
new Promise((resolve, reject) => {
  setTimeout(() => {
    throw new Error('miss error');
  }, 2000);
})
  .then(value => {
    console.log(value);
  })
  .catch(error => {
    console.log('mmm:', error);
  });
```

因为异步函数的回调是在事件队列里单独拉出来执行的。所以在异步函数外面包裹 try-catch 是无法捕捉到回调函数里抛出的异常的。因为当回调函数从队列里被拉出来执行的时候 try-catch 所在的代码块已经执行完毕了。

2.

```javascript
new Promise((resolve, reject) => {
  throw new Error('miss error');
})
  .then(value => {
    console.log(value);
  })
  .catch(error => {
    console.log('mmm:', error);
  });
```

此时 Promise 的 catch 函数可以捕获异常。

## 最佳实践

### 避免 then 函数里面嵌套 then 函数

```javascript
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

    // 这里不继续 then
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

// 两个函数都会输出:
// outer: step 1
// inner: step 1
// inner: step 2
// outer: step 2
// hello world
```

## 实现

### 构造函数

```js
function Promise(resolver) {
  var self = this;
  self.data = undefined; // Promise 的值
  self.status = 'pending'; // Promise 当前的状态
  self.callbacks = []; // Promise 的回调函数集，格式：[{onResolved: Function, onRejected: Function}]

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

### Promise.prototype.then

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
        // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
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
        // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
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
            // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        },
        onRejected: function(reason) {
          try {
            var x = onRejected(reason);
            // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
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

### Promise.prototype.catch

用于指定发生错误时的回调函数。

```javascript
Promise.prototype.catch = function(onRejected) {
  return this.then(null, onRejected);
};
```

### Promise.prototype.finally

用于指定不管 Promise 对象最后状态如何，都会执行的操作。

```javascript
Promise.prototype.catch = function(fn) {
  return this.then(
    function(v) {
      setTimeout(fn);
      return v;
    },
    function(r) {
      setTimeout(fn);
      throw r;
    }
  );
};
```

### Promise.resolve

用于将现有对象转为 Promise 对象，并且状态为 resolved。

```javascript
Promise.resolve = function(value) {
  return new Promise(function(resolve, reject) {
    // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
    resolvePromise(promise, value, resolve, reject);
  });
};
```

### Promise.reject

用于创建一个状态为 rejected 的 Promise 对象。

```javascript
Promise.reject = function(reason) {
  return new Promise(function(resolve, reject) {
    reject(reason);
  });
};
```

### Promise.all

用于将多个 Promise 实例，包装成一个新的 Promise 实例。

```javascript
Promise.all = function(promises) {
  return new Promise(function(resolve, reject) {
    var resolvedCounter = 0; // 计数器
    var promiseNum = promises.length;
    var resolvedValues = new Array(promiseNum); // 完成的 promise
    for (var i = 0; i < promiseNum; i++) {
      (function(i) {
        Promise.resolve(promises[i]).then(
          function(value) {
            resolvedCounter++;
            resolvedValues[i] = value;
            // 等待 promises 全部完成
            if (resolvedCounter === promiseNum) {
              resolve(resolvedValues);
            }
          },
          function(reason) {
            reject(reason);
          }
        );
      })(i);
    }
  });
};
```

## 注释

查看 index.js 文件

## 测试

```bash
npm i promises-aplus-tests -g
promises-aplus-tests ./index.js

# 或者
npm run test
```

## 参考

* [剖析 Promise 内部结构，一步一步实现一个完整的、能通过所有 Test case 的 Promise 类](https://github.com/xieranmaya/blog/issues/3)

- [Promises/A+](https://promisesaplus.com/)

- [We have a problem with promises](https://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html)
