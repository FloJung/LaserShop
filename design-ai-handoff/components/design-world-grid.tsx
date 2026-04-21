import type { DesignerCollection } from "@/lib/types";
import { DesignWorldCard } from "@/components/design-world-card";
import { DesignWorldWideCard } from "@/components/design-world-wide-card";

export function DesignWorldGrid({ collections }: { collections: DesignerCollection[] }) {
  const featuredCollections = collections.slice(0, 2);
  const wideCollection = collections[2];
  const remainingCollections = collections.slice(3);

  if (!collections.length) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:gap-7">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        {featuredCollections.map((collection) => (
          <DesignWorldCard key={collection.slug} collection={collection} />
        ))}
      </div>

      {wideCollection ? <DesignWorldWideCard collection={wideCollection} /> : null}

      {remainingCollections.length ? (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          {remainingCollections.map((collection) => (
            <DesignWorldCard key={collection.slug} collection={collection} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
