import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/darkhold_exchange?schema=public"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().default("darkhold-exchange-secure-session-key-dev-only"),
  SESSION_EXPIRY_HOURS: z.coerce.number().default(24),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().default(5),
  MATCHING_SIM_ENABLED: z
    .string()
    .optional()
    .transform((val) => val !== "false"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.warn("Environment validation warning, using defaults:", error.errors);
  }
  parsedEnv = envSchema.parse({});
}

export const env = parsedEnv;
