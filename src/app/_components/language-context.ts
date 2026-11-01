"use client";

import { createContext, useContext } from "react";

export const LanguageContext = createContext(false);
export const useRomanian = () => useContext(LanguageContext);
