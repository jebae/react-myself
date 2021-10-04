import { context, requestReconcile } from "./fiber.js";
import { isObjDiff } from "./utils.js";

export const useState = (initialState) => {
	const fiber = context.currentFiber;
	const hookIdx = context.hookIdx;
	const oldHook = fiber.alternate?.hooks ? fiber.alternate.hooks[hookIdx] : null;
	const hook = oldHook || { state: initialState, q: [] };

	while (hook.q.length > 0) {
		const action = hook.q.shift();

		if (typeof action === "function")
			hook.state = action(hook.state);
		else
			hook.state = action;
	}

	const setState = (action) => {
		hook.q.push(action);
		requestReconcile(fiber);
	}

	fiber.hooks.push(hook);
	context.hookIdx++;
	return [ hook.state, setState ];
}

export const useEffect = (effect, dependency) => {
	const fiber = context.currentFiber;
	const oldHook = fiber.alternate?.hooks ? fiber.alternate.hooks[context.hookIdx] : null;
	const hook = oldHook || { effect: null, dependency: null };

	if (hook.effect) {
		hook.effect();
		hook.effect = null;
	}

	if (isObjDiff(hook?.dependency, dependency)) {
		hook.effect = effect;
		hook.dependency = dependency;
		requestReconcile(fiber);
	}

	fiber.hooks.push(hook);
	context.hookIdx++;
}