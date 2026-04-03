export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div
        className="
          w-full max-w-md mx-4 p-6
          rounded-3xl
          bg-card/80
          backdrop-blur-xl
          border
          shadow-sm
        "
      >
        {children}
      </div>
    </div>
  );
}
