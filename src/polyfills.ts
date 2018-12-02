export function eventEmitter(ee) {
    ee.prependListener = function (type, listener) {
        if (!this._events[type]) this._events[type] = [];
        this._events[type].unshift(listener);
        return this;
    };
    return ee;
}
