import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";

const CASHFLOW_ENTRIES_COLLECTION = "cashflowEntries";
const CASHFLOW_SUMMARY_COLLECTION = "cashflowSummary";
const CASHFLOW_DAILY_COLLECTION = "cashflowDaily";

type CashflowItem = {
  productId?: string;
  variantId?: string;
  sku?: string;
  title?: string;
  quantity: number;
  price: number;
};

type CashflowOrder = {
  orderId: string;
  total: number;
  currency?: string;
  items: CashflowItem[];
  customer?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function getDateKey(value?: string) {
  if (!value) {
    return nowIso().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return nowIso().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export async function updateCashflow(order: CashflowOrder) {
  const db = getAdminDb();
  const orderRef = db.collection(CASHFLOW_ENTRIES_COLLECTION).doc(order.orderId);
  const summaryRef = db.collection(CASHFLOW_SUMMARY_COLLECTION).doc("overview");
  const dayKey = getDateKey(order.createdAt);
  const dailyRef = db.collection(CASHFLOW_DAILY_COLLECTION).doc(dayKey);
  const timestamp = nowIso();

  return db.runTransaction(async (transaction) => {
    const [entrySnapshot, summarySnapshot, dailySnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(summaryRef),
      transaction.get(dailyRef)
    ]);

    if (entrySnapshot.exists) {
      return {
        orderId: order.orderId,
        alreadyProcessed: true
      };
    }

    const summaryData = summarySnapshot.exists ? ((summarySnapshot.data() as Record<string, unknown>) ?? {}) : {};
    const dailyData = dailySnapshot.exists ? ((dailySnapshot.data() as Record<string, unknown>) ?? {}) : {};
    const totalRevenue = typeof summaryData.totalRevenue === "number" ? summaryData.totalRevenue : 0;
    const orderCount = typeof summaryData.orderCount === "number" ? summaryData.orderCount : 0;
    const todayRevenue = typeof dailyData.revenue === "number" ? dailyData.revenue : 0;
    const todayOrderCount = typeof dailyData.orderCount === "number" ? dailyData.orderCount : 0;

    transaction.set(orderRef, {
      orderId: order.orderId,
      total: order.total,
      currency: order.currency ?? "EUR",
      items: order.items,
      ...(order.customer ? { customer: order.customer } : {}),
      createdAt: order.createdAt ?? timestamp,
      recordedAt: timestamp
    });

    transaction.set(
      summaryRef,
      {
        totalRevenue: totalRevenue + order.total,
        orderCount: orderCount + 1,
        updatedAt: timestamp,
        lastOrderId: order.orderId
      },
      { merge: true }
    );

    transaction.set(
      dailyRef,
      {
        date: dayKey,
        revenue: todayRevenue + order.total,
        orderCount: todayOrderCount + 1,
        updatedAt: timestamp,
        lastOrderId: order.orderId
      },
      { merge: true }
    );

    return {
      orderId: order.orderId,
      alreadyProcessed: false
    };
  });
}
