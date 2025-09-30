'use client';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-gray-600">Please refresh the page or try again later.</p>
        {error?.digest ? <p className="mt-1 text-xs text-gray-400">Ref: {error.digest}</p> : null}
      </div>
    </div>
  );
}


