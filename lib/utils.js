export const isObjDiff = (a, b) => {
	if (typeof a !== typeof b)
		return true;

	if (a === null || a === undefined || b === null || b === undefined)
		return a !== b;

	if (typeof a === "object") {
		const keysA = new Set(Object.keys(a));

		for (const key in b) {
			if (isObjDiff(a[key], b[key]))
				return true;
			keysA.delete(key);
		}

		if (keysA.size !== 0)
			return true;
	} else {
		return a !== b;
	}
	return false;
}

export class EventEmitter {
	constructor() {
		this.map = {};
	}

	on(name, callback) {
		this.map[name] = callback;
	}

	emit(name, ...args) {
		this.map[name](...args);
	}
}