// Every screen in the app's navigation stack.
// `undefined` means that screen takes no navigation parameters.

export type RootStackParamList = {
  Login: undefined;
  FamilySetup: undefined;
  Home: undefined;
  // When expenseId is present, Add Expense opens in "edit" mode for that row.
  AddExpense: { expenseId?: string } | undefined;
  Budgets: undefined;
  Members: undefined;
  Charts: undefined;
  Settings: undefined;
};
