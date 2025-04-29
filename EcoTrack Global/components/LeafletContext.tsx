import { createContext, useContext } from "react";

export const LeafletContext = createContext<any>(null);

export function useLeaflet() {
  return useContext(LeafletContext);
}