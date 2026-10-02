"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SelectionValue {
  colour: string;
  setColour: (c: string) => void;
}

const Ctx = createContext<SelectionValue>({ colour: "", setColour: () => {} });

/**
 * Lets the Colour dropdown (in the purchase panel) and the photo gallery
 * (a sibling column of the product page) share the chosen colour, so picking
 * a colour jumps to that colour's photo. Wrapped around both by the page.
 */
export function ProductSelectionProvider({ children }: { children: ReactNode }) {
  const [colour, setColour] = useState("");
  return <Ctx.Provider value={{ colour, setColour }}>{children}</Ctx.Provider>;
}

export const useProductSelection = () => useContext(Ctx);
