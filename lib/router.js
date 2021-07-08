import { useState } from "./hook.js";
import { EventEmitter } from "./utils.js";

const router = new EventEmitter();

router.on("push", path => {
	history.pushState({}, path, path);
});

export const useRouter = () => {
	return {
		push(path) {
			router.emit("linkTo", path);
		}
	};
}

export const Switch = (props) => {
	const [path, setPath] = useState(window.location.pathname);

	router.on("linkTo", path => {
		router.emit("push", path);
		setPath(path);
	});

	const component = props.children
		.find(component => component.props.path === path);

	return component;
}

export const Route = (props) => {
	return props.children[0];
}