import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type DashboardActions = {
  openImportContacts: () => void;
  openNewContact: () => void;
};

const DashboardActionsContext = createContext<DashboardActions | null>(null);

export function DashboardActionsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DashboardActions;
}) {
  return (
    <DashboardActionsContext.Provider value={value}>
      {children}
    </DashboardActionsContext.Provider>
  );
}

export function useDashboardActions(): DashboardActions | null {
  return useContext(DashboardActionsContext);
}
