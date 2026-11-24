export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-5">
      <div className="h-12 w-56 animate-pulse rounded-2xl bg-black/10" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[4/5] animate-pulse rounded-3xl bg-black/[0.07]" />
        ))}
      </div>
    </div>
  );
}
