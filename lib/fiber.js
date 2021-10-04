import { isObjDiff } from "./utils.js";

const TEXT = "TEXT";
const CREATE = "CREATE";
const UPDATE = "UPDATE";

export const context = {
	currentFiber: null,
	hookIdx: 0,
	garbage: [],
};

export const requestReconcile = (() => {
	let isWorking = false;
	const taskQ = [];

	return (fiber) => {
		taskQ.push(fiber);

		if (isWorking)
			return ;

		isWorking = true;
		while (taskQ.length > 0) {
			const fiber = taskQ.shift();

			fiber.alternate = { ...fiber };
			reconcile(fiber);
			emptyGarbage();
			render(getDOMParent(fiber), fiber);
		}
		isWorking = false;
	}
})();

export const createElement = (type, props={}, ...elements) => {
	const children = elements
		.filter(elem => elem !== undefined && elem !== null)
		.map(elem => typeof elem === "object"
			? elem
			: { type: TEXT, props: { nodeValue: elem.toString(), children: [] } });

	return {
		type,
		props: {
			...props,
			children,
		}
	}
}

const isPropsDiff = (a, b) => {
	const propsA = {...a, children: null};
	const propsB = {...b, children: null};

	return isObjDiff(propsA, propsB);
}

const reconcile = (fiber) => {
	const alternate = fiber.alternate;

	if (alternate)
		alternate.alternate = null;

	if (typeof fiber.type === "function")
		return reconcileFunctionFiber(fiber, alternate);
	else
		return reconcileHostFiber(fiber, alternate);
}

const reconcileFunctionFiber = (fiber, alternate=null) => {
	context.currentFiber = fiber;
	context.hookIdx = 0;
	fiber.hooks = [];
	fiber.child = fiber.type(fiber.props);
	reconcileChild(fiber, fiber.child, alternate?.child);
	reconcile(fiber.child);
	return fiber;
}

const reconcileHostFiber = (fiber, alternate=null) => {
	const { children } = fiber.props;
	let alternateChild = alternate?.child;
	let prev;

	for (let i=0; i < children.length; i++) {
		const child = children[i];

		reconcileChild(fiber, child, alternateChild);
		if (i === 0)
			fiber.child = reconcile(child);
		else
			prev.sibling = reconcile(child);
		prev = child;
		alternateChild = alternateChild?.sibling;
	}

	while (alternateChild) {
		context.garbage.push(alternateChild);
		alternateChild = alternateChild.sibling;
	}
	return fiber;
}

const reconcileChild = (parent, child, alternate=null) => {
	child.alternate = alternate;
	child.parent = parent;
	child.dom = null;
	child.tag = null;

	if (!alternate) {
		child.tag = CREATE;
	} else if (child.type !== alternate.type || child.props.key !== alternate.props.key) {
		child.tag = CREATE;
		child.alternate = null;
		context.garbage.push(alternate);
	} else if (isPropsDiff(alternate.props, child.props)) {
		child.tag = UPDATE;
		child.dom = alternate.dom;
	} else {
		child.dom = alternate.dom;
	}
}

const render = (parentDOM, fiber) => {
	if (typeof fiber.type === "function") {
		render(parentDOM, fiber.child);
		fiber.sibling && render(parentDOM, fiber.sibling);
		fiber.tag = null;
		return ;
	}

	const { tag, type, props } = fiber;

	if (tag === CREATE) {
		fiber.dom = createDOM(type, props);
		parentDOM.appendChild(fiber.dom);
	} else if (tag === UPDATE) {
		updateDOM(fiber.dom, fiber.alternate?.props, fiber.props);
	}

	fiber.child && render(fiber.dom, fiber.child);
	fiber.sibling && render(parentDOM, fiber.sibling);
	fiber.tag = null;
}

const createDOM = (type, props) => {
	const dom = (type === TEXT)
		? document.createTextNode(props.nodeValue)
		: document.createElement(type);

	updateDOM(dom, {}, props);
	return dom;
}

const updateDOM = (dom, prevProps, nextProps) => {
	const toDelete = Object.keys(prevProps)
		.filter(key => key !== "children" && isObjDiff(prevProps[key], nextProps[key]));

	for (const key of toDelete) {
		if (key.startsWith("on")) {
			dom.removeEventListener(key.slice(2).toLowerCase(), prevProps[key]);
		} else {
			dom[key] = "";
		}
	}

	const toAdd = Object.keys(nextProps)
		.filter(key => key !== "children" && isObjDiff(prevProps[key], nextProps[key]));

	for (const key of toAdd) {
		if (key.startsWith("on")) {
			dom.addEventListener(key.slice(2).toLowerCase(), nextProps[key]);
		} else {
			dom[key] = nextProps[key];
		}
	}
}

const getDOMParent = (fiber) => {
	let parent = fiber.parent;

	while (parent && !parent.dom)
		parent = parent.parent;
	return parent.dom;
}

const emptyGarbage = () => {
	while (context.garbage.length > 0) {
		const fiber = context.garbage.pop();
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

export const renderDOM = (fiber, dom) => {
	fiber.parent = {
		dom,
	};

	requestReconcile(fiber);
}