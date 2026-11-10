import { api } from "./api";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatCustomerCode,
} from "./customerService";

export interface StatementLedgerItem {
  entry_id: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  type: "CREDIT_SALE" | "PAYMENT" | "REVERSAL";
  amount_minor: number;
  note?: string | null;
  occurred_at: string;
  due_date?: string | null;
  running_balance_minor: number;
}

export interface OverdueCustomerReportItem {
  customer: CustomerItem;
  code: string;
  overdue_minor: number;
  outstanding_minor: number;
  oldest_due_date: string | null;
  days_late: number;
}

export interface DailyChartBar {
  dateLabel: string;
  creditMinor: number;
  paymentMinor: number;
}

export const reportApi = {
  // 1. ප්‍රධාන Reports පිටුව සහ Daily Summary සඳහා සියලු දත්ත ගණනය කිරීම
  getShopReportsOverview: async (selectedDateIso?: string) => {
    const custRes = await shopAndCustomerApi.listCustomers({
      status: "ACTIVE",
      limit: 100,
    });
    const customers = custRes.items || [];

    let totalOutstandingMinor = 0;
    let overdueCustomersCount = 0;
    let periodCreditMinor = 0;
    let periodPaymentsMinor = 0;

    customers.forEach((c) => {
      const bal = c.balance_summary;
      if (bal) {
        totalOutstandingMinor += bal.outstanding_balance_minor || 0;
        if ((bal.overdue_balance_minor || 0) > 0) {
          overdueCustomersCount += 1;
        }
        periodCreditMinor += bal.total_credit_minor || 0;
        periodPaymentsMinor += bal.total_paid_minor || 0;
      }
    });

    // සියලුම පාරිභෝගිකයින්ගේ මෑත ගනුදෙනු ලබාගැනීම
    const allEntries: StatementLedgerItem[] = [];
    const dailyMap: Record<
      string,
      { creditMinor: number; paymentMinor: number }
    > = {};

    await Promise.all(
      customers.map(async (cust, idx) => {
        const code = formatCustomerCode(cust.customer_id, idx);
        try {
          const stRes = await api.get(
            `/customers/${cust.customer_id}/statement`,
            { params: { limit: 30 } }
          );
          const rawItems = stRes.data?.items || [];

          // පැරණිතම ගනුදෙනුවේ සිට Running Balance ගණනය කිරීම
          const chronological = [...rawItems].reverse();
          let runBal = 0;
          const withRunning: StatementLedgerItem[] = chronological.map(
            (e: any) => {
              if (e.status === "POSTED") {
                if (e.type === "CREDIT_SALE") runBal += e.amount_minor || 0;
                else if (e.type === "PAYMENT")
                  runBal = Math.max(0, runBal - (e.amount_minor || 0));
              }
              const dayKey = (e.occurred_at || "").slice(0, 10);
              if (dayKey && e.status === "POSTED") {
                if (!dailyMap[dayKey]) {
                  dailyMap[dayKey] = { creditMinor: 0, paymentMinor: 0 };
                }
                if (e.type === "CREDIT_SALE")
                  dailyMap[dayKey].creditMinor += e.amount_minor || 0;
                if (e.type === "PAYMENT")
                  dailyMap[dayKey].paymentMinor += e.amount_minor || 0;
              }

              return {
                entry_id: e.entry_id,
                customer_id: cust.customer_id,
                customer_name: cust.name,
                customer_code: code,
                type: e.type,
                amount_minor: e.amount_minor || 0,
                note: e.note,
                occurred_at: e.occurred_at,
                due_date: e.due_date,
                running_balance_minor: runBal,
              };
            }
          );

          allEntries.push(...withRunning);
        } catch {
          // Ignore single customer error
        }
      })
    );

    allEntries.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );

    // Chart bars සෑදීම
    const sortedDays = Object.keys(dailyMap).sort().slice(-4);
    const chartBars: DailyChartBar[] = sortedDays.map((dayStr) => {
      const d = new Date(dayStr);
      const label = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      return {
        dateLabel: label,
        creditMinor: dailyMap[dayStr].creditMinor,
        paymentMinor: dailyMap[dayStr].paymentMinor,
      };
    });

    // තෝරාගත් දවසේ (හෝ අද දවසේ) ගනුදෙනු පෙරහන් කිරීම
    const targetDay =
      selectedDateIso ||
      sortedDays[sortedDays.length - 1] ||
      new Date().toISOString().slice(0, 10);

    const dayEntries = allEntries.filter((e) =>
      e.occurred_at?.startsWith(targetDay)
    );

    let dayCreditMinor = 0;
    let dayCreditCount = 0;
    let dayPaymentMinor = 0;
    let dayPaymentCount = 0;

    dayEntries.forEach((e) => {
      if (e.type === "CREDIT_SALE") {
        dayCreditMinor += e.amount_minor;
        dayCreditCount += 1;
      } else if (e.type === "PAYMENT") {
        dayPaymentMinor += e.amount_minor;
        dayPaymentCount += 1;
      }
    });

    return {
      customers,
      totalCustomers: customers.length,
      totalOutstandingMinor,
      overdueCustomersCount,
      periodCreditMinor,
      periodPaymentsMinor,
      chartBars,
      targetDay,
      dayEntries,
      dayCreditMinor,
      dayCreditCount,
      dayPaymentMinor,
      dayPaymentCount,
      availableDates: sortedDays.reverse(),
    };
  },

  // 2. Overdue Customers ලැයිස්තුව සහ ප්‍රමාද වූ දින ගණන ලබාගැනීම
  getOverdueCustomersReport: async (): Promise<OverdueCustomerReportItem[]> => {
    const custRes = await shopAndCustomerApi.listCustomers({
      status: "ACTIVE",
      limit: 100,
    });
    const customers = custRes.items || [];
    const results: OverdueCustomerReportItem[] = [];

    await Promise.all(
      customers.map(async (cust, index) => {
        const overdueMinor = cust.balance_summary?.overdue_balance_minor || 0;
        const outMinor = cust.balance_summary?.outstanding_balance_minor || 0;
        if (overdueMinor <= 0) return;

        const code = formatCustomerCode(cust.customer_id, index);
        let oldestDueDate: string | null = null;
        let daysLate = 1;

        try {
          const stRes = await api.get(
            `/customers/${cust.customer_id}/statement`,
            { params: { limit: 25 } }
          );
          const entries = stRes.data?.items || [];
          const overdueEntries = entries.filter(
            (e: any) =>
              e.type === "CREDIT_SALE" &&
              e.status === "POSTED" &&
              (e.remaining_unpaid_minor || 0) > 0 &&
              e.due_date &&
              new Date(e.due_date) < new Date()
          );

          if (overdueEntries.length > 0) {
            overdueEntries.sort(
              (a: any, b: any) =>
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            );
            oldestDueDate = overdueEntries[0].due_date;
            const diffMs =
              new Date().getTime() - new Date(oldestDueDate!).getTime();
            daysLate = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }
        } catch {
          // Ignore statement error
        }

        results.push({
          customer: cust,
          code,
          overdue_minor: overdueMinor,
          outstanding_minor: outMinor,
          oldest_due_date: oldestDueDate,
          days_late: daysLate,
        });
      })
    );

    return results;
  },

  // 3. එක් පාරිභෝගිකයෙකුගේ සම්පූර්ණ Statement එක ලබාගැනීම
  getCustomerStatementReport: async (customerId: string) => {
    const customer = await shopAndCustomerApi.getCustomer(customerId);
    const stRes = await api.get(`/customers/${customerId}/statement`, {
      params: { limit: 50 },
    });
    const rawItems = stRes.data?.items || [];

    // Chronological order (පැරණිතම සිට අලුත්ම දක්වා)
    const chronological = [...rawItems].reverse();
    let totalCreditMinor = 0;
    let totalPaymentsMinor = 0;
    let runningBal = 0;

    const ledgerItems: StatementLedgerItem[] = chronological.map((e: any) => {
      if (e.status === "POSTED") {
        if (e.type === "CREDIT_SALE") {
          totalCreditMinor += e.amount_minor || 0;
          runningBal += e.amount_minor || 0;
        } else if (e.type === "PAYMENT") {
          totalPaymentsMinor += e.amount_minor || 0;
          runningBal = Math.max(0, runningBal - (e.amount_minor || 0));
        } else if (e.type === "REVERSAL") {
          runningBal = Math.max(0, runningBal - (e.amount_minor || 0));
        }
      }
      return {
        entry_id: e.entry_id,
        customer_id: customerId,
        customer_name: customer.name,
        customer_code: formatCustomerCode(customerId),
        type: e.type,
        amount_minor: e.amount_minor || 0,
        note: e.note,
        occurred_at: e.occurred_at,
        due_date: e.due_date,
        running_balance_minor: runningBal,
      };
    });

    const closingBalanceMinor =
      customer.balance_summary?.outstanding_balance_minor ?? runningBal;
    const openingBalanceMinor = Math.max(
      0,
      closingBalanceMinor - totalCreditMinor + totalPaymentsMinor
    );

    return {
      customer,
      openingBalanceMinor,
      totalCreditMinor,
      totalPaymentsMinor,
      closingBalanceMinor,
      items: ledgerItems,
    };
  },
};