export class EventEmitter {
	constructor() {
		this.eventMap = {};
	}

	on(eventName, callback) {
		this.eventMap[eventName] = callback;
	}

	emit(eventName, ...arg) {
		this.eventMap[eventName](...arg);
	}
}

export const isObjDiff = (prev, next) => {
	if (typeof prev !== typeof next)
		return true;

	if (prev === null || prev === undefined || next === null || next === undefined)
		return prev !== next;

	const nextKeys = new Set(Object.keys(next));

	for (const key in prev) {
		if (!nextKeys.has(key))
			return true;

		if (typeof prev[key] !== typeof next[key])
			return true;

		if (typeof prev[key] === "object") {
			if (isObjDiff(prev[key], next[key]))
				return true;
		} else if (prev[key] !== next[key]) {
			return true;
		}

		nextKeys.delete(key);
	}

	if (nextKeys.size > 0)
		return true;
	return false;
}

export const isPropsDiff = (prev, next) => {
	const prevWithoutChildren = { ...prev, children: null };
	const nextWithoutChildren = { ...next, children: null };

	return isObjDiff(prevWithoutChildren, nextWithoutChildren);
}