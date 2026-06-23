// Bottom-tab screens (the main sections).
export type TabParamList = {
  Home: undefined;
  Charts: undefined;
  Budgets: undefined;
  Members: undefined;
};

// Root stack: Login, the tabs, and the screens that open OVER the tabs.
// `undefined` means the screen takes no navigation parameters.
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  // When expenseId is present, Add Expense opens in "edit" mode for that row.
  AddExpense: { expenseId?: string } | undefined;
  Settings: undefined;
  Spaces: undefined;
  Recurring: undefined;
};
