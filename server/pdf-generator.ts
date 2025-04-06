import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { UrlStatus } from "@shared/schema";
import { chromium } from 'playwright-chromium';

// Keep track of active browser contexts for cleanup
const activeBrowsers = new Map<string, any>();

// Generate PDFs for a list of URLs
export async function generatePdfs(
  jobId: string,
  urls: string[],
  outputPath: string
): Promise<void> {
  let browser = null;
  
  try {
    console.log(`Starting PDF generation for job ${jobId} with ${urls.length} URLs`);
    console.log(`Output path: ${outputPath}`);
    
    // Make sure the output directory exists
    try {
      // Use a default path if the provided one isn't accessible
      if (!outputPath || outputPath === '/Downloads/pdfs') {
        outputPath = './generated-pdfs';
        console.log(`Using default output path: ${outputPath}`);
      }
      
      await fs.promises.mkdir(outputPath, { recursive: true });
      console.log(`Created output directory: ${outputPath}`);
    } catch (error) {
      console.error(`Failed to create output directory: ${(error as Error).message}`);
      await updateJobStatus(jobId, "failed", `Failed to create output directory: ${(error as Error).message}`);
      return;
    }

    // Update job status
    await updateJobStatus(jobId, "processing");
    
    // Launch browser once for all URLs, using system Chromium
    browser = await chromium.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Store the browser for potential cancellation
    activeBrowsers.set(jobId, browser);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each URL using Playwright
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`Processing URL (${i+1}/${urls.length}): ${url}`);
      
      // Create a new context for each URL
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1024 }
      });
      const page = await context.newPage();
      
      try {
        // Update URL status
        await updateUrlStatus(jobId, i, "processing");
        
        // Generate a filename based on the URL
        // Extract domain for a cleaner filename
        let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${domain}_${timestamp}.pdf`;
        const filePath = path.join(outputPath, filename);
        
        console.log(`Navigating to URL: ${url}`);
        
        // Navigate to URL with timeout and wait until network is idle
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 60000 // Increase timeout to 60 seconds
        });
        
        console.log('Page loaded, waiting for content to render');
        
        // Wait a bit for any additional content to render
        await page.waitForTimeout(2000);
        
        // Scroll to bottom to load lazy content
        await autoScroll(page);
        
        console.log('Page scrolled, waiting before PDF creation');
        
        // Wait a bit more after scrolling
        await page.waitForTimeout(1000);
        
        console.log(`Generating PDF: ${filePath}`);
        
        // Generate PDF
        await page.pdf({
          path: filePath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0.4in',
            right: '0.4in',
            bottom: '0.4in',
            left: '0.4in'
          }
        });
        
        // Check if the file was created
        if (fs.existsSync(filePath)) {
          console.log(`PDF saved successfully: ${filePath}`);
          // Update URL status
          await updateUrlStatus(jobId, i, "complete");
          successCount++;
        } else {
          throw new Error("PDF file was not created");
        }
      } catch (error) {
        console.error(`Error processing URL ${url}: ${(error as Error).message}`);
        // Update URL status to failed
        await updateUrlStatus(jobId, i, "failed", (error as Error).message);
        failCount++;
      } finally {
        // Close the context for this URL
        await context.close();
      }
    }
    
    console.log(`PDF generation complete. Success: ${successCount}, Failed: ${failCount}`);
    
    // Update job status to completed
    const job = await storage.getPdfJob(jobId);
    if (job) {
      await storage.updatePdfJob(jobId, {
        ...job,
        status: "completed",
        completed: true,
        successCount,
        failCount,
        outputPath: outputPath // Update with potentially modified path
      });
    }
  } catch (error) {
    console.error("Error in PDF generation:", error);
    
    // Update job status to failed
    await updateJobStatus(jobId, "failed", (error as Error).message);
  } finally {
    // Cleanup browser
    if (browser) {
      try {
        await browser.close();
        activeBrowsers.delete(jobId);
      } catch (err) {
        console.error("Error closing browser:", err);
      }
    }
  }
}

// Function to scroll page to bottom
async function autoScroll(page: any) {
  return page.evaluate(async () => {
    return new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Get the status of a job
export async function getJobStatus(jobId: string) {
  const job = await storage.getPdfJob(jobId);
  return job;
}

// Cancel a job
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await storage.getPdfJob(jobId);
  
  if (!job || job.completed) {
    return false;
  }
  
  // Close and cleanup any active browser
  const browser = activeBrowsers.get(jobId);
  if (browser) {
    try {
      console.log(`Closing browser for cancelled job ${jobId}`);
      await browser.close();
      activeBrowsers.delete(jobId);
    } catch (error) {
      console.error(`Error closing browser for job ${jobId}:`, error);
    }
  }
  
  // Update job status
  await storage.updatePdfJob(jobId, {
    ...job,
    status: "cancelled",
    completed: true,
  });
  
  return true;
}

// Helper function to update job status
async function updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
  const job = await storage.getPdfJob(jobId);
  
  if (job) {
    await storage.updatePdfJob(jobId, {
      ...job,
      status,
      completed: status === "completed" || status === "failed",
    });
  }
}

// Helper function to update URL status
async function updateUrlStatus(
  jobId: string,
  urlIndex: number,
  status: "pending" | "processing" | "complete" | "failed",
  error?: string
): Promise<void> {
  const job = await storage.getPdfJob(jobId);
  
  if (job && Array.isArray(job.urlStatuses)) {
    const urlStatuses = [...job.urlStatuses] as UrlStatus[];
    
    if (urlIndex >= 0 && urlIndex < urlStatuses.length) {
      urlStatuses[urlIndex] = {
        ...urlStatuses[urlIndex],
        status,
        error,
      };
      
      await storage.updatePdfJob(jobId, {
        ...job,
        urlStatuses,
      });
    }
  }
}
