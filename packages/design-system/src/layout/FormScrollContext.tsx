import { createContext, useContext, type ReactNode } from 'react';

type FormScrollApi = {
  /** Call from focused TextInput onFocus so mid-session field switches also scroll. */
  ensureFocusedVisible: () => void;
};

const FormScrollContext = createContext<FormScrollApi | null>(null);

export function useFormScroll(): FormScrollApi | null {
  return useContext(FormScrollContext);
}

export function FormScrollProvider({
  value,
  children,
}: {
  value: FormScrollApi;
  children: ReactNode;
}) {
  return <FormScrollContext.Provider value={value}>{children}</FormScrollContext.Provider>;
}
