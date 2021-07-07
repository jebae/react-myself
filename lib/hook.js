import { context, requestReconcile } from "./fiber.js";
import { isObjDiff } from "./utils.js";

export const useState = (initialState) => {
	const fiber = context.currentFiber;
	const oldHook = fiber.prev?.hooks[context.hookIdx];
	const hook = {
		state: oldHook ? oldHook.state : initialState,
		queue: [],
	};

	const actions = oldHook?.queue || [];

	for (const action of actions) {
		if (typeof action === "function")
			hook.state = action(hook.state);
		else
			hook.state = action;
	}

	const setState = (action) => {
		hook.queue.push(action);
		requestReconcile(fiber);
	}

	fiber.hooks.push(hook);
	context.hookIdx++;

	return [hook.state, setState];
}

export const useEffect = (effect, dependencies) => {
	const fiber = context.currentFiber;
	const oldHook = fiber.prev?.hooks[context.hookIdx];
	const hook = { dependencies };

	if (dependencies === undefined
		|| (isObjDiff(oldHook?.dependencies, dependencies)))
		effect();

	fiber.hooks.push(hook);
	context.hookIdx++;
}