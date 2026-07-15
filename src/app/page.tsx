'use client';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">Welcome</h1>
          <p className="mt-4 text-muted-foreground">Your project is ready.</p>
        </div>
      </main>
    </div>
  );
}
