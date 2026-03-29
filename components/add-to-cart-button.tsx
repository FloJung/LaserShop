"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/button";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  className
}: {
  product: Product;
  className?: string;
}) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      className={className}
      onClick={() => {
        addProduct(product);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
    >
      <ShoppingCart size={16} />
      <span>{added ? "Hinzugefuegt" : "In den Warenkorb"}</span>
    </Button>
  );
}
