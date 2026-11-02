import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.PORT
        ? `http://localhost:${process.env.PORT}`
        : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient()],
});

export const { signIn, signOut, useSession } = authClient;
