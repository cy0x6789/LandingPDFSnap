import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep the users table as it appears to be required by the application
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// New schema for PDF jobs
export const pdfJobs = pgTable("pdf_jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  urls: jsonb("urls").notNull(),
  outputPath: text("output_path").notNull(),
  status: text("status").notNull().default("pending"),
  completed: boolean("completed").notNull().default(false),
  urlStatuses: jsonb("url_statuses").notNull(),
  successCount: integer("success_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertPdfJobSchema = createInsertSchema(pdfJobs).pick({
  jobId: true,
  urls: true,
  outputPath: true,
  status: true,
  completed: true,
  urlStatuses: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPdfJob = z.infer<typeof insertPdfJobSchema>;
export type PdfJob = typeof pdfJobs.$inferSelect;

// Validation schemas for API requests
export const generatePdfSchema = z.object({
  urls: z.array(z.string().url()).min(1, "At least one URL is required"),
  outputPath: z.string().min(1, "Output path is required"),
});

export type GeneratePdfRequest = z.infer<typeof generatePdfSchema>;

// URL status type
export const urlStatusSchema = z.object({
  url: z.string(),
  status: z.enum(["pending", "processing", "complete", "failed"]),
  error: z.string().optional(),
});

export type UrlStatus = z.infer<typeof urlStatusSchema>;
