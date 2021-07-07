import { isObjDiff } from "./utils.js";

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
			: { type: "TEXT", props: { nodeValue: child.toString() }, children: [] })

	return {
		type,
		props,
		children,
		hooks: []
	}
};

// renew fiber children and tag CREATE, UPDATE, DELETE
const reconcile = (fiber) => {
	const prev = fiber.prev;

	if (prev)
		prev.prev = null; // free prev of prev fiber

	if (typeof fiber.type === "function") {
		context.currentFiber = fiber;
		context.hookIdx = 0;
		fiber.children = [ fiber.type(fiber.props, fiber.children) ];
	}

	let oldChildIdx = 0;

	for (const child of fiber.children) {
		child.parent = fiber;
		child.prev = prev && prev.children[oldChildIdx++];

		if (!child.prev) {
			child.tag = "CREATE";
			child.dom = null;
		} else if (child.prev.type !== child.type) {
			child.tag = "CREATE";
			child.dom = null;
			context.fiberGarbage.push(child.prev);
			child.prev = null;
		} else if (isObjDiff(child.prev.props, child.props)) {
			child.tag = "UPDATE";
			child.dom = child.prev.dom;
		} else {
			child.dom = child.prev.dom;
		}

		reconcile(child);
	}

	if (prev) {
		while (oldChildIdx < prev.children.length)
			context.fiberGarbage.push(prev.children[oldChildIdx++]);
	}
}

const render = (parentDOM, fiber) => {
	if (typeof fiber.type === "function")
		return render(parentDOM, fiber.children[0]);

	if (fiber.tag === "CREATE") {
		fiber.dom = createDOM(fiber.type, fiber.props);
		parentDOM.appendChild(fiber.dom);
	} else if (fiber.tag === "UPDATE") {
		updateDOM(fiber.dom, fiber.prev.props, fiber.props);
	}

	for (const child of fiber.children) {
		render(fiber.dom, child);
	}
}

const emptyFiberGarbage = () => {
	while (context.fiberGarbage.length > 0) {
		const fiber = context.fiberGarbage.pop();
		let domFiber = fiber;

		while (domFiber && !domFiber.dom)
			domFiber = domFiber.children[0];

		if (!domFiber)
			continue ;

		let parent = fiber.parent;

		while (parent && !parent.dom)
			parent = fiber.parent;

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
		.filter(key => prevProps[key] !== nextProps);

	for (const key of toRemove) {
		if (key.startsWith("on")) {
			const eventName = key.slice(2).toLowerCase();

			dom.removeEventListener(eventName, prevProps[key]);
		} else {
			dom[key] = "";
		}
	}

	const toAdd = Object.keys(nextProps)
		.filter(key => prevProps[key] !== nextProps);

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