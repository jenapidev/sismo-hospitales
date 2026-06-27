"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

/** Translate common Supabase auth errors to Spanish. */
function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "Ese correo ya tiene una cuenta. Inicia sesión.";
  if (m.includes("password")) return "La contraseña no cumple los requisitos (mínimo 6 caracteres).";
  if (m.includes("email")) return "Correo inválido.";
  return msg;
}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const dest = next && next.startsWith("/") ? next : "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);
    const supabase = createBrowserClient();

    if (mode === "signup") {
      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        setPending(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(translate(error.message));
        setPending(false);
        return;
      }
      if (data.session) {
        window.location.assign(dest); // logged in immediately (email confirmation off)
        return;
      }
      setInfo("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
      setMode("signin");
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(translate(error.message));
      setPending(false);
      return;
    }
    window.location.assign(dest);
  }

  const field =
    "w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-gray-500";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {info && <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">{info}</p>}

      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu-correo@ejemplo.com"
        className={field}
      />
      <input
        type="password"
        required
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        className={field}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "…" : mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {mode === "signup" ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <button type="button" onClick={() => setMode("signin")} className="text-blue-700 hover:underline">
              Inicia sesión
            </button>
          </>
        ) : (
          <>
            ¿No tienes cuenta?{" "}
            <button type="button" onClick={() => setMode("signup")} className="text-blue-700 hover:underline">
              Crear una
            </button>
          </>
        )}
      </p>
    </form>
  );
}
