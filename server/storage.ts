import { users, type User, type InsertUser, type PdfJob, type InsertPdfJob } from "@shared/schema";

// Extend the storage interface to include PDF job operations
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // PDF job operations
  createPdfJob(job: InsertPdfJob): Promise<PdfJob>;
  getPdfJob(jobId: string): Promise<PdfJob | undefined>;
  updatePdfJob(jobId: string, updates: Partial<PdfJob>): Promise<PdfJob | undefined>;
  deletePdfJob(jobId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pdfJobs: Map<string, PdfJob>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.pdfJobs = new Map();
    this.currentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // PDF job operations
  async createPdfJob(insertJob: InsertPdfJob): Promise<PdfJob> {
    const id = this.currentId++;
    const job: PdfJob = { 
      ...insertJob, 
      id,
      createdAt: new Date().toISOString(),
    };
    
    this.pdfJobs.set(insertJob.jobId, job);
    return job;
  }

  async getPdfJob(jobId: string): Promise<PdfJob | undefined> {
    return this.pdfJobs.get(jobId);
  }

  async updatePdfJob(jobId: string, updates: Partial<PdfJob>): Promise<PdfJob | undefined> {
    const job = this.pdfJobs.get(jobId);
    
    if (!job) {
      return undefined;
    }
    
    const updatedJob = { ...job, ...updates };
    this.pdfJobs.set(jobId, updatedJob);
    
    return updatedJob;
  }

  async deletePdfJob(jobId: string): Promise<boolean> {
    return this.pdfJobs.delete(jobId);
  }
}

export const storage = new MemStorage();
