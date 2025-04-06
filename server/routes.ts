import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generatePdfSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { generatePdfs, getJobStatus, cancelJob } from "./pdf-generator";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // PDF generation routes
  app.post("/api/pdf/generate", async (req, res) => {
    try {
      // Validate the request body
      const validatedData = generatePdfSchema.parse(req.body);
      
      // Create a unique job ID
      const jobId = randomUUID();
      
      // Initialize URL statuses
      const urlStatuses = validatedData.urls.map(url => ({
        url,
        status: "pending",
      }));
      
      // Store the job in memory
      await storage.createPdfJob({
        jobId,
        urls: validatedData.urls,
        outputPath: validatedData.outputPath,
        status: "pending",
        completed: false,
        urlStatuses,
      });
      
      // Start the PDF generation process in the background
      generatePdfs(jobId, validatedData.urls, validatedData.outputPath);
      
      // Return the job ID to the client
      res.json(jobId);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Error generating PDFs:", error);
        res.status(500).json({ message: "Failed to start PDF generation" });
      }
    }
  });
  
  // List all files in a directory (project files explorer)
  app.get("/api/files/list", async (req, res) => {
    try {
      const directory = req.query.directory as string || "./generated-pdfs";
      
      // Make sure the directory exists
      try {
        await fs.promises.mkdir(directory, { recursive: true });
      } catch (error) {
        console.error(`Failed to ensure directory exists: ${(error as Error).message}`);
      }
      
      try {
        const files = await fs.promises.readdir(directory, { withFileTypes: true });
        
        const filesList = files.map(file => {
          const isDirectory = file.isDirectory();
          const fullPath = path.join(directory, file.name);
          
          let fileSize = 0;
          let modifiedTime = "";
          
          try {
            const stats = fs.statSync(fullPath);
            fileSize = stats.size;
            modifiedTime = stats.mtime.toISOString();
          } catch (error) {
            console.error(`Error getting file stats: ${(error as Error).message}`);
          }
          
          return {
            name: file.name,
            path: fullPath,
            isDirectory,
            size: fileSize,
            modifiedTime,
            // Add URLs for file operations
            downloadUrl: isDirectory ? null : `/api/files/download?path=${encodeURIComponent(fullPath)}`,
            viewUrl: (isDirectory || !file.name.endsWith('.pdf')) ? null : `/api/files/view?path=${encodeURIComponent(fullPath)}`
          };
        });
        
        res.json({
          directory,
          files: filesList,
          parentDirectory: directory === './' ? null : path.dirname(directory)
        });
      } catch (error) {
        console.error("Error reading directory:", error);
        return res.status(500).json({ message: `Could not read directory: ${(error as Error).message}` });
      }
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ message: "Failed to list files" });
    }
  });
  
  // Get job status
  app.get("/api/pdf/status/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const jobStatus = await getJobStatus(jobId);
      
      if (!jobStatus) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(jobStatus);
    } catch (error) {
      console.error("Error getting job status:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });
  
  // Cancel job
  app.post("/api/pdf/cancel", async (req, res) => {
    try {
      const { jobId } = req.body;
      const success = await cancelJob(jobId);
      
      if (!success) {
        return res.status(404).json({ message: "Job not found or already completed" });
      }
      
      res.json({ message: "Job cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling job:", error);
      res.status(500).json({ message: "Failed to cancel job" });
    }
  });

  // List all PDFs for a job
  app.get("/api/pdf/list/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await getJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const outputDir = job.outputPath;
      
      try {
        const files = await fs.promises.readdir(outputDir);
        const pdfFiles = files.filter(file => file.endsWith('.pdf'));
        
        // Return the list of PDF files with URLs for viewing and downloading
        res.json({
          files: pdfFiles.map(file => ({
            name: file,
            path: `${outputDir}/${file}`,
            viewUrl: `/api/pdf/view/${encodeURIComponent(file)}?jobId=${jobId}`,
            downloadUrl: `/api/pdf/download/${encodeURIComponent(file)}?jobId=${jobId}`
          }))
        });
      } catch (error) {
        console.error("Error reading output directory:", error);
        return res.status(500).json({ message: `Could not read output directory: ${(error as Error).message}` });
      }
    } catch (error) {
      console.error("Error listing PDFs:", error);
      res.status(500).json({ message: "Failed to list PDFs" });
    }
  });

  // View a PDF file
  app.get("/api/pdf/view/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const jobId = req.query.jobId as string;
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }
      
      const job = await getJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const filePath = path.join(job.outputPath, decodeURIComponent(filename));
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "PDF file not found" });
      }
      
      // Set Content-Type for viewing in browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error viewing PDF:", error);
      res.status(500).json({ message: "Failed to view PDF" });
    }
  });

  // Download a PDF file
  app.get("/api/pdf/download/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const jobId = req.query.jobId as string;
      
      if (!jobId) {
        return res.status(400).json({ message: "Job ID is required" });
      }
      
      const job = await getJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const filePath = path.join(job.outputPath, decodeURIComponent(filename));
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "PDF file not found" });
      }
      
      // Set Content-Type and Content-Disposition for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ message: "Failed to download PDF" });
    }
  });

  // View any file by path
  app.get("/api/files/view", async (req, res) => {
    try {
      const filePath = req.query.path as string;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Determine content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream'; // Default content type
      
      // Map extensions to content types
      const contentTypeMap: {[key: string]: string} = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
      };
      
      if (contentTypeMap[ext]) {
        contentType = contentTypeMap[ext];
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error viewing file:", error);
      res.status(500).json({ message: "Failed to view file" });
    }
  });
  
  // Download any file by path
  app.get("/api/files/download", async (req, res) => {
    try {
      const filePath = req.query.path as string;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });
  
  // Delete a file
  app.delete("/api/files/delete", async (req, res) => {
    try {
      const filePath = req.query.path as string;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if it's a directory
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        return res.status(400).json({ message: "Cannot delete a directory" });
      }
      
      // Delete the file
      await fs.promises.unlink(filePath);
      
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
