import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E3A5F] p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center text-white">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#0D9488] text-xl font-bold">
            IT
          </div>
          <h1 className="text-xl font-bold">IT Service Desk</h1>
          <p className="text-sm text-slate-300">Asset Management Platform</p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-slate-400">
          Demo seed: admin@company.local / Admin123! · tech@company.local / Tech123!
        </p>
      </div>
    </div>
  );
}
