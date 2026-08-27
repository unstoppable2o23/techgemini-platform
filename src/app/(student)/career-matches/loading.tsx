export default function Loading() {
  return (
    <div className="space-y-4 p-6 pt-20 max-w-3xl mx-auto">
      <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
