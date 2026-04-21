"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  CUSTOM_COASTER_PRODUCT,
  calculateCartCount,
  calculateCartSubtotal,
  createCartItemFromProduct,
  getCartItemMergeKey,
  sanitizeCartItem,
  sanitizeCartItems
} from "@/lib/cart";
import type { CartItem } from "@/lib/cart";
import type { CoasterDesignDocument } from "@/lib/design-tool";
import type { Product } from "@/lib/types";
import type { CartItemPersonalization } from "@/shared/catalog";

const CART_STORAGE_KEY = "laser-shop-cart";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addProduct: (product: Product, configurations?: CartItemPersonalization[]) => void;
  addCustomDesign: (payload: { designJson: CoasterDesignDocument; previewImage: string }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }

      setItems(sanitizeCartItems(parsed as CartItem[]));
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(sanitizeCartItems(items)));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      count: calculateCartCount(items),
      subtotal: calculateCartSubtotal(items),
      addProduct: (product, configurations) => {
        setItems((current) => {
          const nextItem = createCartItemFromProduct(product, configurations);
          const nextMergeKey = getCartItemMergeKey(nextItem);
          const existing = current.find((item) => item.lineType === "product" && getCartItemMergeKey(item) === nextMergeKey);
          if (existing) {
            return current.map((item) =>
              item.id === existing.id ? sanitizeCartItem({ ...item, quantity: item.quantity + 1 }) : sanitizeCartItem(item)
            );
          }

          return [...current, nextItem];
        });
      },
      addCustomDesign: ({ designJson, previewImage }) => {
        setItems((current) => [
          ...current.map(sanitizeCartItem),
          sanitizeCartItem({
            id: makeId("custom"),
            lineType: "custom-design",
            productId: CUSTOM_COASTER_PRODUCT.id,
            variantId: CUSTOM_COASTER_PRODUCT.variantId,
            name: CUSTOM_COASTER_PRODUCT.name,
            price: CUSTOM_COASTER_PRODUCT.price,
            quantity: 1,
            imageUrl: CUSTOM_COASTER_PRODUCT.image,
            previewImage,
            subtitle: "10 x 10 cm · Individuelle Gravur",
            designJson
          })
        ]);
      },
      removeItem: (itemId) => {
        setItems((current) => current.filter((item) => item.id !== itemId));
      },
      updateQuantity: (itemId, quantity) => {
        setItems((current) =>
          current.flatMap((item) => {
            if (item.id !== itemId) {
              return [sanitizeCartItem(item)];
            }

            if (quantity <= 0) {
              return [];
            }

            return [sanitizeCartItem({ ...item, quantity })];
          })
        );
      },
      clearCart: () => {
        setItems([]);
      }
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
