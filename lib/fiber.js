import { isPropsDiff } from "./utils.js";

export const context = {
	currentFiber: null,
	hookIdx: 0,
	fiberGarbage: [],
};

export const requestReconcile = (() => {
	let isWorking = false;
	const taskQ = [];

	return (root) => {
		taskQ.push(root);
		if (isWorking)
			return ;

		isWorking = true;
		while (taskQ.length > 0) {
			const fiber = taskQ.shift();

			fiber.prev = { ...fiber };
			fiber.hooks = [];
			reconcile(fiber);
			emptyFiberGarbage();
			render(getDOMparent(fiber), fiber);
		}
		isWorking = false;
	}
})();

export const createElement = (type, props, ...elems) => {
	const children = elems
		.filter(child => child !== undefined && child !== null)
		.map(child => (typeof child === "object")
			? child
			: { type: "TEXT", props: { nodeValue: child.toString(), children: [] } })

	return {
		type,
		props: {
			...props,
			children,
		},
		hooks: []
	}
};

const reconcile = (fiber) => {
	const prev = fiber.prev;

	if (prev)
		prev.prev = null; // free prev of prev fiber

	if (typeof fiber.type === "function") {
		return reconcileFunctionFiber(fiber, prev);
	} else {
		return reconcileHostFiber(fiber, prev);
	}
}

const reconcileHostFiber = (fiber, prev) => {
	const { children } = fiber.props;
	let oldChild = prev?.child;
	let prevChild;

	for (let i=0; i < children.length; i++) {
		const child = children[i];

		reconcileChild(fiber, child, oldChild);
		if (i === 0)
			fiber.child = reconcile(child);
		else
			prevChild.sibling = reconcile(child);
		prevChild = child;
		oldChild = oldChild?.sibling;
	}

	while (oldChild) {
		context.fiberGarbage.push(oldChild);
		oldChild = oldChild.sibling;
	}
	return fiber;
}

const reconcileFunctionFiber = (fiber, prev) => {
	context.currentFiber = fiber;
	context.hookIdx = 0;
	fiber.child = fiber.type(fiber.props);
	reconcileChild(fiber, fiber.child, prev?.child);
	reconcile(fiber.child);
	return fiber;
}

const reconcileChild = (parent, child, prev=null) => {
	child.parent = parent;
	child.prev = prev;

	if (!prev) {
		child.tag = "CREATE";
		child.dom = null;
	} else if (prev.type !== child.type || prev.props.key !== child.props.key) {
		child.tag = "CREATE";
		child.dom = null;
		child.prev = null;
		context.fiberGarbage.push(prev);
	} else if (isPropsDiff(prev.props, child.props)) {
		child.tag = "UPDATE";
		child.dom = prev.dom;
	} else {
		child.dom = prev.dom;
	}
}

const render = (parentDOM, fiber) => {
	if (typeof fiber.type === "function") {
		render(parentDOM, fiber.child);
		if (fiber.sibling)
			render(parentDOM, fiber.sibling);
		return ;
	}

	if (fiber.tag === "CREATE") {
		fiber.dom = createDOM(fiber.type, fiber.props);
		parentDOM.appendChild(fiber.dom);
	} else if (fiber.tag === "UPDATE") {
		updateDOM(fiber.dom, fiber.prev.props, fiber.props);
	}

	if (fiber.child)
		render(fiber.dom, fiber.child);
	if (fiber.sibling)
		render(parentDOM, fiber.sibling);
}

const emptyFiberGarbage = () => {
	while (context.fiberGarbage.length > 0) {
		const fiber = context.fiberGarbage.pop();
		let domFiber = fiber;

		while (domFiber && !domFiber.dom)
			domFiber = domFiber.child;

		if (!domFiber)
			continue ;

		let parent = fiber.parent;

		while (parent && !parent.dom)
			parent = parent.parent;

		parent && parent.dom.removeChild(domFiber.dom);
	}
}

const createDOM = (type, props) => {
	const dom = type === "TEXT"
		? document.createTextNode(props.value)
		: document.createElement(type);

	updateDOM(dom, {}, props);
	return dom;
}

const updateDOM = (dom, prevProps, nextProps) => {
	const toRemove = Object.keys(prevProps)
		.filter(key => key !== "children" && prevProps[key] !== nextProps);

	for (const key of toRemove) {
		if (key.startsWith("on")) {
			const eventName = key.slice(2).toLowerCase();

			dom.removeEventListener(eventName, prevProps[key]);
		} else {
			dom[key] = "";
		}
	}

	const toAdd = Object.keys(nextProps)
		.filter(key => key !== "children" && prevProps[key] !== nextProps);

	for (const key of toAdd) {
		if (key.startsWith("on")) {
			const eventName = key.slice(2).toLowerCase();

			dom.addEventListener(eventName, nextProps[key]);
		} else {
			dom[key] = nextProps[key];
		}
	}
}

const getDOMparent = (fiber) => {
	let parent = fiber.parent;

	while (parent && !parent.dom)
		parent = parent.parent;
	return parent.dom;
}

export const renderDOM = (fiber, parent) => {
	fiber.parent = {
		dom: parent,
	}
	requestReconcile(fiber);
}