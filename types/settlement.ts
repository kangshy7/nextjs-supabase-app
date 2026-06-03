// 정산 관련 타입 정의

export type Expense = {
  id: string;
  event_id: string;
  description: string;
  amount: number;
  paid_by: string; // user_id
  created_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  participant_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
};

// get_settlement_summary RPC 반환 타입
export type SettlementSummaryItem = {
  participant_id: string;
  guest_name: string;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
};

export type ExpenseWithPayer = Expense & {
  payer_name: string;
};
