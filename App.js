import { createElement } from "./lib/fiber.js";
import { useEffect, useState } from "./lib/hook.js";
import { Switch, Route, useRouter } from "./lib/router.js";
import { SearchInput } from "./SearchInput.js";

export default () => {
	const [ num, setNum ] = useState(0);
	const [ msg, setMessage ] = useState("");
	const [text, setText] = useState("");
	const increment = () => setNum(prev => prev + 1);
	const decrement = () => setNum(prev => prev - 1);

	useEffect(() => {
		if (num % 5 === 0)
			setMessage(() => `From number ${num}`)
	}, [ num ]);

	useEffect(() => {
		setMessage(() => `From message ${text}`)
	}, [ text ]);

	return (
		createElement("div", {},
			createElement(Btn, {
				value: "UP",
				onClick: increment,
			}),
			createElement("h3", {},
				num,
			),
			createElement("h2", {},
				msg,
			),
			num > 3
				? createElement(Btn, {
					value: "DOWN",
					onClick: decrement,
				})
				: null,
			createElement("input", {
				type: "text",
				value: text,
				onInput: (e) => { setText(e.target.value) },
			}),
			createElement(SearchInput),
			createElement(Switch, {},
				createElement(Route, { path: "/" }, createElement(Home, {})),
				createElement(Route, { path: "/profile" }, createElement(Profile, {})),
			)
		)
	);
}

const Btn = (props) => {
	const { onClick, value } = props;

	return (
		createElement("input", {
			type: "button",
			onClick,
			value,
		})
	);
}

const Home = () => {
	const router = useRouter();

	return (
		createElement("div", {},
			createElement("h3", {}, "home"),
			createElement("span",
				{
					onClick: () => router.push("/profile"),
				},
				"Lets go profile"
			)
		)
	);
}

const Profile = () => {
	const router = useRouter();

	return (
		createElement("div", {},
			createElement("h3", {}, "profile"),
			createElement("span",
				{
					onClick: () => router.push("/"),
				},
				"Lets go home"
			)
		)
	);
}