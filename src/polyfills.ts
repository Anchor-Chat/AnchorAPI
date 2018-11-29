export function eventEmitter(ee) {
    ee.prependListener = function (type, listener) {
        this._events[type].unshift(listener);
        return this;
    };
    return ee;
}
