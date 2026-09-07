import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
  );
}

const REMEMBER_ME_KEY = "kampus-remember-me";

// "Angemeldet bleiben" beim Login: steuert, ob die Supabase-Session in
// localStorage (ueberlebt Browser-Neustart) oder sessionStorage (endet mit
// dem Tab) landet. Muss vor signInWithPassword()/signUp() aufgerufen werden.
export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
}

// Supabase erlaubt nur ein Storage-Backend pro Client-Instanz, daher schaltet
// dieser Adapter beim Schreiben selbst zwischen local- und sessionStorage um.
const rememberAwareStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return;
    const remember = localStorage.getItem(REMEMBER_ME_KEY) !== "false";
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: rememberAwareStorage },
});
