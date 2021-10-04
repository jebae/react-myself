import { createElement } from "./lib/fiber.js";
import { useState, useEffect } from "./lib/hook.js";

export const SearchInput = (props) => {
  const [ keyword, setKeyword ] = useState("");

  return (
    createElement("input", {
        className: "SearchInput",
        placeholder: "고양이를 검색해보세요.|",
        onInput: e => setKeyword(e.target.value),
        value: keyword,
      },
    )
  );
}