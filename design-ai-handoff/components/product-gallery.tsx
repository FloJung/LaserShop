"use client";

import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = images[selectedImageIndex] ?? images[0];

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white p-4 card-shadow sm:mx-auto sm:w-full sm:max-w-[30rem] md:max-w-[28rem] lg:mx-0 lg:max-w-none">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--muted-surface)] md:h-[18rem] md:aspect-auto lg:h-[22rem] xl:h-[26rem] 2xl:h-[30rem]">
        <Image
          key={selectedImage}
          src={selectedImage}
          alt={productName}
          fill
          className="object-cover transition-opacity duration-200 ease-out"
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5 md:mt-3.5 lg:gap-3">
        {images.map((item, index) => {
          const isActive = index === selectedImageIndex;

          return (
            <button
              key={`${item}-${index}`}
              type="button"
              aria-pressed={isActive}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-xl border bg-[var(--muted-surface)] transition",
                isActive
                  ? "border-[var(--brand)] shadow-[0_0_0_1px_rgba(231,119,44,0.2)]"
                  : "border-[var(--line)] hover:border-[var(--brand)]"
              )}
              onClick={() => {
                setSelectedImageIndex(index);
              }}
            >
              <Image src={item} alt={`${productName} Galerie ${index + 1}`} fill className="object-cover" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
