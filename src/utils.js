module.exports = {
	promisify(fn) {
		return (...args) => {
			return new Promise((resolve, reject) => {
				fn(...args, function (err, res) {
					if (err) {
						return reject(err);
					}
					return resolve(res);
				})
			})
		}
	}
}