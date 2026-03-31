import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import {
  orderDocumentSchema,
  orderItemConfigurationDocumentSchema,
  orderItemDocumentSchema
} from "@/shared/catalog";

export type AdminOrderConfiguration = ReturnType<typeof orderItemConfigurationDocumentSchema.parse> & {
  id: string;
};

export type AdminOrderItem = ReturnType<typeof orderItemDocumentSchema.parse> & {
  id: string;
  configurations: AdminOrderConfiguration[];
};

export type AdminOrder = ReturnType<typeof orderDocumentSchema.parse> & {
  id: string;
  items: AdminOrderItem[];
};

export async function getRecentAdminOrders(limit = 20): Promise<AdminOrder[]> {
  const snapshot = await getAdminDb()
    .collection("orders")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return Promise.all(
    snapshot.docs.map(async (orderDoc) => {
      const order = orderDocumentSchema.parse(orderDoc.data());
      const itemsSnapshot = await orderDoc.ref.collection("items").orderBy("createdAt", "asc").get();

      const items = await Promise.all(
        itemsSnapshot.docs.map(async (itemDoc) => {
          const item = orderItemDocumentSchema.parse(itemDoc.data());
          const configurationsSnapshot = await itemDoc.ref.collection("configurations").orderBy("createdAt", "asc").get();

          return {
            id: itemDoc.id,
            ...item,
            configurations: configurationsSnapshot.docs.map((configurationDoc) => ({
              id: configurationDoc.id,
              ...orderItemConfigurationDocumentSchema.parse(configurationDoc.data())
            }))
          } satisfies AdminOrderItem;
        })
      );

      return {
        id: orderDoc.id,
        ...order,
        items
      } satisfies AdminOrder;
    })
  );
}
