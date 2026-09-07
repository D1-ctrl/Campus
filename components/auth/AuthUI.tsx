"use client";

import { useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Camera, Eye, EyeOff, Plus } from "lucide-react";

export const authInputClass =
  "w-full rounded-2xl bg-[#F2F2F2] px-4 py-3 text-sm text-[#252525] placeholder:text-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#3883FA]/40";

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#252525]">{label}</span>
      {children}
    </label>
  );
}

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">;

export function PasswordField({ label = "Passwort", value, onChange, ...props }: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <AuthField label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${authInputClass} pr-11`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#727272]"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </AuthField>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.32-.17-1.94H10v3.68h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.33 2.99-7.26Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.61-2.42l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20Z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.92a5.99 5.99 0 0 1 0-3.84V5.49H1.06a10 10 0 0 0 0 9.02l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.49l3.35 2.6c.79-2.37 2.99-4.13 5.59-4.13Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#252525" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.15-1.212 2.9-.83.83-1.99 1.4-3.09 1.32-.13-1.15.46-2.34 1.2-3.06.83-.84 2.19-1.44 3.1-1.16ZM20.6 17.13c-.55 1.28-.81 1.86-1.52 2.98-.99 1.55-2.38 3.48-4.12 3.5-1.53.02-1.93-.99-4.01-.98-2.08.01-2.52.99-4.05.97-1.73-.02-3.05-1.75-4.04-3.3C.36 16.7-.35 12.05 1.4 8.9c1.14-2.05 3.18-3.35 5.38-3.38 1.6-.02 3.1 1.08 4.08 1.08.97 0 2.8-1.34 4.72-1.14.8.03 3.06.32 4.51 2.43-.12.07-2.69 1.57-2.67 4.7.03 3.74 3.28 4.98 3.32 5-.03.09-.5 1.73-1.66 3.44Z" />
    </svg>
  );
}

export function SocialLoginRow() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <button
          type="button"
          disabled
          aria-label="Mit Google anmelden (bald verfügbar)"
          className="flex flex-1 cursor-not-allowed items-center justify-center rounded-full bg-[#F2F2F2] py-3 opacity-60"
        >
          <GoogleIcon />
        </button>
        <button
          type="button"
          disabled
          aria-label="Mit Apple anmelden (bald verfügbar)"
          className="flex flex-1 cursor-not-allowed items-center justify-center rounded-full bg-[#F2F2F2] py-3 opacity-60"
        >
          <AppleIcon />
        </button>
      </div>
      <p className="text-center text-xs text-[#727272]">Google- &amp; Apple-Login folgen bald</p>
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-black/10" />
      <span className="text-xs font-medium text-[#727272]">ODER</span>
      <div className="h-px flex-1 bg-black/10" />
    </div>
  );
}

type AuthSubmitButtonProps = {
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function AuthSubmitButton({
  loading,
  icon,
  children,
  type = "submit",
  className = "",
  ...props
}: AuthSubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={`mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#3883FA] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
      {!loading && icon}
    </button>
  );
}

type AvatarPickerProps = {
  previewUrl: string | null;
  onSelect: (file: File) => void;
};

export function AvatarPicker({ previewUrl, onSelect }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6 flex justify-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Profilbild hinzufügen"
        className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#F2F2F2]"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera size={26} className="text-[#a0a0a0]" />
        )}
        <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#3883FA] text-white ring-2 ring-white">
          <Plus size={14} strokeWidth={2.5} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
        className="hidden"
      />
    </div>
  );
}
