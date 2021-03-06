var Promise = (function() {
  function Promise(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError(
        'Promise executor ' + executor + ' is not a function'
      );
    }

    // why?
    // if (!(this instanceof Promise)) return new Promise(executor);

    var self = this;
    self.data = undefined; // Promise 的值
    self.status = 'pending'; // Promise 当前的状态
    self.callbacks = []; // Promise 的回调函数集，格式：[{onResolved: Function, onRejected: Function}]

    // setTimeout 用于异步执行，模拟 micro Task
    function resolve(value) {
      setTimeout(function() {
        if (self.status !== 'pending') {
          return;
        }

        self.status = 'resolved';
        self.data = value;

        for (var i = 0; i < self.callbacks.length; i++) {
          self.callbacks[i].onResolved(value);
        }
      });
    }

    // setTimeout 用于异步执行，模拟 micro Task
    function reject(reason) {
      setTimeout(function() {
        if (self.status !== 'pending') {
          return;
        }

        self.status = 'rejected';
        self.data = reason;

        for (var i = 0; i < self.callbacks.length; i++) {
          self.callbacks[i].onRejected(reason);
        }
      });
    }

    // 执行 executor 的过程中有可能出错，所以用 try/catch 包起来，出错后以 catch 到的值 reject 掉这个 Promise
    try {
      executor(resolve, reject);
    } catch (reason) {
      reject(reason);
    }
  }

  /**
   * 根据 x 的值来决定 promise 的状态，resolve 或 reject
   *
   * [Promise Resolution Procedure](https://promisesaplus.com/#point-47)
   *
   * @param {Promise}  promise
   * @param {all}      x
   * @param {Function} resolve
   * @param {Function} reject
   *
   * @return {undefined}
   */
  function resolvePromise(promise, x, resolve, reject) {
    var then;
    var thenCalledOrThrow = false;

    // 2.3.1: If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if (promise === x) {
      reject(new TypeError('Chaining cycle detected for promise!'));
    }

    // 2.3.3: Otherwise, if x is an object or function
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      try {
        // 2.3.3.1 因为 x.then 有可能是一个 getter，这种情况下多次读取就有可能产生副作用
        // 即要判断它的类型，又要调用它，这就是两次读取
        then = x.then;
        if (typeof then === 'function') {
          then.call(
            x,
            // 2.3.3.3.1
            function rs(y) {
              if (thenCalledOrThrow) return; // 2.3.3.3.3 即这三处谁选执行就以谁的结果为准
              thenCalledOrThrow = true;
              resolvePromise(promise, y, resolve, reject); // 2.3.3.3.1
            },
            // 2.3.3.3.2
            function rj(r) {
              if (thenCalledOrThrow) return; // 2.3.3.3.3 即这三处谁选执行就以谁的结果为准
              thenCalledOrThrow = true;
              reject(r);
            }
          );
        } else {
          // 2.3.3.4
          resolve(x);
        }
      } catch (e) {
        if (thenCalledOrThrow) return; // 2.3.3.3.3 即这三处谁选执行就以谁的结果为准
        thenCalledOrThrow = true;
        reject(e);
      }
    } else {
      // 2.3.4
      resolve(x);
    }
  }

  /**
   * Promise 核心方法
   *
   * @param {Function}  onResolved  resolved 时的回调函数
   * @param {Function}  onRejected  rejected 时的回调函数
   *
   * @return {Promise} 一个新的 Promise 实例
   */
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
        setTimeout(function() {
          try {
            // 调用 onResolved
            var x = onResolved(self.data);
            // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      }));
    }

    // 当前 promise 状态已确定，且为 rejected
    if (self.status === 'rejected') {
      return (promise2 = new Promise(function(resolve, reject) {
        setTimeout(function() {
          try {
            // 调用 onRejected
            var x = onRejected(self.data);
            // 根据 x 的值来决定 promise 的状态，兼容不同的 Promise 实现，如 Q、bluebird 等
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
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

  /**
   * 指定发生错误时的回调函数
   *
   * @param {Function}  onRejected  rejected 时的回调函数
   *
   * @return {Promise} 一个新的 Promise 实例
   */
  Promise.prototype.catch = function(onRejected) {
    return this.then(null, onRejected);
  };

  /**
   * 指定不管 Promise 对象最后状态如何，都会执行的操作
   *
   * @param {Function}  fn  想要执行的回调函数
   *
   * @return {Promise} 一个新的 Promise 实例
   */
  Promise.prototype.finally = function(fn) {
    // 为什么这里可以呢，因为所有的 then 调用是一起的，但是这个 then 里调用 fn 又异步了一次，所以它总是最后调用的。
    // 当然这里只能保证在已添加的函数里是最后一次，不过这也是必然。
    // 不过看起来比其它的实现要简单以及容易理解的多。
    // 貌似对 finally 的行为没有一个公认的定义，所以这个实现目前是跟 Q 保持一致，会返回一个新的 Promise 而不是原来那个。
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

  /**
   * 将现有对象转为 Promise 对象，并且状态为 resolved
   *
   * @param {all}  value  Promise 实例 / thenable 的对象 / 确定的值
   *
   * @return {Promise} 一个新的 Promise 实例
   */
  Promise.resolve = function(value) {
    return new Promise(function(resolve, reject) {
      resolvePromise(promise, value, resolve, reject);
    });
  };

  /**
   * 创建一个状态为 rejected 的 Promise 对象
   *
   * @param {all}  reason  确定的值
   *
   * @return {Promise} 一个新的 Promise 实例
   */
  Promise.reject = function(reason) {
    return new Promise(function(resolve, reject) {
      reject(reason);
    });
  };

  /**
   * 将多个 Promise 实例，包装成一个新的 Promise 实例
   * promises 内所有的 promise 被 resolved 后，新的 Promise 实例才会被 resolve
   * promises 内任一个 promise 被 rejected 后，新的 Promise 实例就会被 reject
   *
   * @param {Array}  promises
   *
   * @return {Promise} 一个新的 Promise 实例
   */
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

  /**
   * 将多个 Promise 实例，包装成一个新的 Promise 实例
   * 只要 promises 内有一个 promise 改变状态，新的 Promise 实例就会改变状态
   *
   * @param {Array}  promises
   *
   * @return {Promise} 一个新的 Promise 实例
   */
  Promise.race = function(promises) {
    return new Promise(function(resolve, reject) {
      for (var i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).then(
          function(value) {
            resolve(value);
          },
          function(reason) {
            reject(reason);
          }
        );
      }
    });
  };

  Promise.done = Promise.stop = function() {
    // 传入空函数导致 promise 一直处于 pending 状态，使后面的函数不会被调用
    return new Promise(function() {});
  };

  Promise.deferred = Promise.defer = function() {
    var dfd = {};
    dfd.promise = new Promise(function(resolve, reject) {
      dfd.resolve = resolve;
      dfd.reject = reject;
    });
    return dfd;
  };

  try {
    // CommonJS compliance
    module.exports = Promise;
  } catch (e) {}

  return Promise;
})();
