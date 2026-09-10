import Link from "next/link";
import Image from "next/image";

export function CategoryCard({
  name,
  slug,
  imageUrl,
}: {
  name: string;
  slug: string;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={`/shop?category=${slug}`}
      className="group relative flex h-28 items-end overflow-hidden rounded-xl2 border border-navy-100 bg-navy-800 shadow-card sm:h-36"
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="200px"
          className="object-cover opacity-60 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-50"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/10 to-transparent" />
      <span className="relative z-10 p-3 text-sm font-semibold text-white">{name}</span>
    </Link>
  );
}
