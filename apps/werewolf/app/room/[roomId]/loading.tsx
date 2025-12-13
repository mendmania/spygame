export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-gray-400">Loading room...</p>
      </div>
    </div>
  );
}
