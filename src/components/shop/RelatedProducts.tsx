import { ProductCard, type ProductCardData } from "./ProductCard";

/** "You may also like": a swipeable row on phones, a grid from tablet up. Same cards as the shop. */
export function RelatedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-16" aria-labelledby="related-heading">
      <h2 id="related-heading" className="text-xl font-bold text-navy-900">You may also like</h2>
      <ul className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-4">
        {products.map((p) => (
          <li key={p.slug} className="w-44 shrink-0 snap-start sm:w-auto sm:shrink">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}
