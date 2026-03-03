"use client";

import React, { useEffect, useRef } from "react";

/**
 * Simple, robust contentEditable wrapper.
 * - live updates via onInput
 * - keeps DOM in sync if parent value changes
 * - prevents Enter/new-line for headings (h1/h2)
 *
 * Props:
 * - value (string)
 * - onChange (fn)
 * - as ("h1" | "h2" | "p" | "span", default "span")
 * - className (string)
 */
export default function EditableText({
  value,
  onChange,
  className = "",
  as = "span",
}) {
  const ref = useRef(null);
  const Tag = as;

  // keep DOM in sync when the external value changes
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label="Editable text"
      onInput={(e) => onChange(e.currentTarget.innerText)}
      onKeyDown={(e) => {
        // Prevent Enter/newline for headings to keep layout clean.
        if ((as === "h1" || as === "h2") && e.key === "Enter") {
          e.preventDefault();
          // blur to commit change (optional)
          ref.current && ref.current.blur();
        }
      }}
      className={`${className} cursor-text outline-none hover:opacity-90 focus:opacity-100 px-2 py-1`}
    />
  );
}