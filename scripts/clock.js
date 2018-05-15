// Very simple implementation of a clock that we can run to completion
function Clock(startTime, endTime) {
    this._callbackIndex = 1;
    this._now = startTime;
    this._end = endTime;
    this._callbacks = new Map();
    this._timeslots = new Map();
}
Clock.prototype.now = function () {
    return this._now;
}
Clock.prototype.evaluate = function () {
    const keys = [...this._timeslots.keys()];
    keys.sort();
    for (let k = 0; k < keys.length; k++) {
        if (keys[k] > this._now) {
            continue;
        }
        const set = this._timeslots.get(keys[k]);
        [...set].forEach(callback => {
            if (callback.active)
                callback.func()
        });
        this._timeslots.delete(keys[k]);
    }
}
Clock.prototype.tick = function () {
    this._now++;
    this.evaluate();
}
Clock.prototype.runToEnd = function () {
    while (this._timeslots.size > 0) {
        const keys = [...this._timeslots.keys()];
        keys.sort((a, b) => a - b);
        const key = keys.shift();
        this._now = key;
        this.evaluate();
    }
}
Clock.prototype.addCallback = function (func, time, index) {
    let callback = this._callbacks.get(index);
    if (callback === undefined) {
        callback = {
            func: func,
            active: true
        };
        this._callbacks.set(index, callback);
    }
    let set = this._timeslots.get(time);
    if (set === undefined) {
        set = new Set();
        this._timeslots.set(time, set);
    }
    set.add(callback);
}
Clock.prototype.setTimeout = function (func, timeout) {
    const index = this._callbackIndex++;
    this.addCallback(func, this._now + timeout, index);
    return index;
}
Clock.prototype.setInterval = function (func, interval) {
    const index = this._callbackIndex++;
    for (let i = this._now; i < this._end; i += interval) {
        this.addCallback(func, i, index);
    }
    return index;
}
Clock.prototype.clearInterval = function (index) {
    const cb = this._callbacks.get(index);
    if (cb !== undefined) {
        cb.active = false;
    }
}