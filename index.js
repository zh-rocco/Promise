var Promise = (function() {
  function Promise(resolver) {
    if (typeof resolver !== 'function') {
      throw new TypeError(
        'Promise resolver ' + resolver + ' is not a function'
      );
    }
    if (!(this instanceof Promise)) return new Promise(resolver);

    var self = this;
    self.data = undefined; // Promise 的值
    self.status = 'pending'; // Promise 当前的状态
    self.callbacks = []; // Promise 时的回调函数集，格式：[{onResolved: Function, onRejected: Function]

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

    // 执行 resolver 的过程中有可能出错，所以用 try/catch 包起来，出错后以 catch 到的值 reject 掉这个 Promise
    try {
      resolver(resolve, reject);
    } catch (reason) {
      reject(reason);
    }
  }

  /**
   * 根据 x 的值来决定 promise 的状态
   *
   * [Promise Resolution Procedure](https://promisesaplus.com/#point-47)
   *
   * @param {Promise}  promise
   * @param {all}      x
   * @param {Function} resolve
   * @param {Function} reject
   *
   * @return {Function} promise 的状态，resolve 或 reject
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

  Promise.prototype.valueOf = function() {
    return this.data;
  };

  Promise.prototype.catch = function(onRejected) {
    return this.then(null, onRejected);
  };

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

  Promise.prototype.spread = function(fn, onRejected) {
    return this.then(function(values) {
      return fn.apply(null, values);
    }, onRejected);
  };

  Promise.prototype.inject = function(fn, onRejected) {
    return this.then(function(v) {
      return fn.apply(
        null,
        fn
          .toString()
          .match(/\((.*?)\)/)[1]
          .split(',')
          .map(function(key) {
            return v[key];
          })
      );
    }, onRejected);
  };

  Promise.prototype.delay = function(duration) {
    return this.then(
      function(value) {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            resolve(value);
          }, duration);
        });
      },
      function(reason) {
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            reject(reason);
          }, duration);
        });
      }
    );
  };

  Promise.all = function(promises) {
    return new Promise(function(resolve, reject) {
      var resolvedCounter = 0;
      var promiseNum = promises.length;
      var resolvedValues = new Array(promiseNum);
      for (var i = 0; i < promiseNum; i++) {
        (function(i) {
          Promise.resolve(promises[i]).then(
            function(value) {
              resolvedCounter++;
              resolvedValues[i] = value;
              if (resolvedCounter === promiseNum) {
                return resolve(resolvedValues);
              }
            },
            function(reason) {
              return reject(reason);
            }
          );
        })(i);
      }
    });
  };

  Promise.race = function(promises) {
    return new Promise(function(resolve, reject) {
      for (var i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).then(
          function(value) {
            return resolve(value);
          },
          function(reason) {
            return reject(reason);
          }
        );
      }
    });
  };

  Promise.resolve = function(value) {
    var promise = new Promise(function(resolve, reject) {
      resolvePromise(promise, value, resolve, reject);
    });
    return promise;
  };

  Promise.reject = function(reason) {
    return new Promise(function(resolve, reject) {
      reject(reason);
    });
  };

  Promise.fcall = function(fn) {
    // 虽然 fn 可以接收到上一层 then 里传来的参数，但是其实是 undefined，所以跟没有是一样的，因为 resolve 没参数啊
    return Promise.resolve().then(fn);
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
