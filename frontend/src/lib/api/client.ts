import axios from "axios";
import { requestAppLayoutRevalidation } from "@/lib/revalidate-app-layout";

const baseURL =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.PORT
        ? `http://localhost:${process.env.PORT}`
        : "http://localhost:3000");

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Let the runtime set multipart boundary; default JSON Content-Type breaks FormData. */
api.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);

api.interceptors.response.use(
  (response) => {
    if (typeof window === "undefined") return response;
    const m = (response.config.method || "").toLowerCase();
    if (!MUTATION_METHODS.has(m)) return response;
    const u = response.config.url || "";
    if (u.includes("/api/revalidate/")) return response;
    requestAppLayoutRevalidation();
    return response;
  },
  (err) => Promise.reject(err),
);
