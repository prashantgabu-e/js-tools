import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { ALLOWED_GOOGLE_EMAILS, AUTH_SESSION_KEY, GOOGLE_CLIENT_ID } from "../constants";
import type { AuthUser } from "../types";

interface AuthGateProps {
  children: (auth: { user: AuthUser; logoutButton: ReactNode }) => ReactNode;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleJwtPayload {
  email?: string;
  name?: string;
  picture?: string;
  exp?: number;
}

type GoogleAccounts = {
  accounts?: {
    id?: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number | boolean>) => void;
      disableAutoSelect: () => void;
    };
  };
};

function readStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const user = JSON.parse(raw) as AuthUser;
    const isAllowed = ALLOWED_GOOGLE_EMAILS.includes(user.email);
    const isFresh = user.exp * 1000 > Date.now();
    return isAllowed && isFresh ? user : null;
  } catch {
    return null;
  }
}

function decodeCredential(credential: string): AuthUser {
  const [, payload] = credential.split(".");
  if (!payload) {
    throw new Error("Google did not return a valid sign-in token.");
  }

  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decodedPayload = decodeURIComponent(
    atob(normalizedPayload)
      .split("")
      .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
  const parsed = JSON.parse(decodedPayload) as GoogleJwtPayload;

  if (!parsed.email || !parsed.exp) {
    throw new Error("Google sign-in did not include an email address.");
  }

  return {
    email: parsed.email,
    name: parsed.name ?? parsed.email,
    picture: parsed.picture ?? "",
    exp: parsed.exp
  };
}

function getGoogleAccounts(): GoogleAccounts["accounts"] | undefined {
  return (window as Window & { google?: GoogleAccounts }).google?.accounts;
}

export function AuthGate({ children }: AuthGateProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AuthUser | null>(() => (typeof window === "undefined" ? null : readStoredUser()));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID) {
      return;
    }

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      const googleAccounts = getGoogleAccounts();
      if (!googleAccounts?.id || !buttonRef.current) {
        if (attempts > 80) {
          window.clearInterval(intervalId);
          setMessage("Google sign-in could not load. Check your internet connection and refresh.");
        }
        return;
      }

      window.clearInterval(intervalId);
      googleAccounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          try {
            if (!response.credential) {
              throw new Error("Google sign-in was cancelled.");
            }

            const nextUser = decodeCredential(response.credential);
            if (!ALLOWED_GOOGLE_EMAILS.includes(nextUser.email)) {
              window.localStorage.removeItem(AUTH_SESSION_KEY);
              setUser(null);
              setMessage(`${nextUser.email} is not allowed to access this app.`);
              return;
            }

            window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextUser));
            setMessage("");
            setUser(nextUser);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
          }
        }
      });
      googleAccounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: "signin_with",
        width: 280
      });
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [user]);

  function logout() {
    getGoogleAccounts()?.id?.disableAutoSelect();
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    setUser(null);
    setMessage("");
  }

  if (user) {
    const logoutButton = (
      <div className="auth-user">
        {user.picture ? <img src={user.picture} alt="" /> : null}
        <span>{user.email}</span>
        <button type="button" onClick={logout}>
          <LogOut className="icon" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    );

    return <>{children({ user, logoutButton })}</>;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__icon" aria-hidden="true">
          <ShieldCheck className="icon" />
        </div>
        <p className="eyebrow">Private access</p>
        <h1>Money Manage</h1>
        <p>Sign in with an approved Google account to continue.</p>

        {GOOGLE_CLIENT_ID ? <div className="auth-google-button" ref={buttonRef} /> : <p className="auth-message is-error">Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in.</p>}

        {message ? (
          <p className={`auth-message${message.includes("not allowed") || message.includes("failed") || message.includes("could not") ? " is-error" : ""}`}>
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
