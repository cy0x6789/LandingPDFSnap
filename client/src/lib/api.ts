import { apiRequest } from "./queryClient";

let isCancelled = false;

export interface PdfFile {
  name: string;
  path: string;
  viewUrl: string;
  downloadUrl: string;
}

export async function generatePdfs(
  urls: string[],
  outputPath: string,
  progressCallback: (index: number, status: string, error?: string) => void
): Promise<{ successCount: number; failCount: number; jobId: string }> {
  isCancelled = false;

  try {
    // Initial request to start the PDF generation process
    const response = await apiRequest("POST", "/api/pdf/generate", {
      urls,
      outputPath,
    });

    const jobId = await response.json();

    // Poll for status updates
    const result = await pollJobStatus(jobId, progressCallback);
    return { ...result, jobId };
  } catch (error) {
    throw new Error(`Failed to start PDF generation: ${(error as Error).message}`);
  }
}

async function pollJobStatus(
  jobId: string,
  progressCallback: (index: number, status: string, error?: string) => void
): Promise<{ successCount: number; failCount: number }> {
  let isDone = false;
  let result = { successCount: 0, failCount: 0 };

  while (!isDone && !isCancelled) {
    try {
      const response = await apiRequest("GET", `/api/pdf/status/${jobId}`, undefined);
      const status = await response.json();

      console.log("Received status update:", status);

      // Update progress for each URL
      if (status.urlStatuses) {
        status.urlStatuses.forEach((urlStatus: any, index: number) => {
          progressCallback(index, urlStatus.status, urlStatus.error);
        });
      }

      isDone = status.completed;
      
      if (isDone) {
        console.log("Job is complete with counts:", {
          successCount: status.successCount,
          failCount: status.failCount
        });
        
        result = {
          successCount: status.successCount || 0,
          failCount: status.failCount || 0,
        };
      } else {
        // Wait a bit before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      throw new Error(`Failed to check job status: ${(error as Error).message}`);
    }
  }

  if (isCancelled) {
    throw new Error("PDF generation was cancelled");
  }

  return result;
}

export async function cancelPdfGeneration(jobId: string): Promise<void> {
  isCancelled = true;
  try {
    await apiRequest("POST", "/api/pdf/cancel", { jobId });
  } catch (error) {
    throw new Error(`Failed to cancel PDF generation: ${(error as Error).message}`);
  }
}

// Get list of PDF files generated for a job
export async function listPdfFiles(jobId: string): Promise<PdfFile[]> {
  try {
    const response = await apiRequest("GET", `/api/pdf/list/${jobId}`, undefined);
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    throw new Error(`Failed to list PDF files: ${(error as Error).message}`);
  }
}

// Get URL for viewing a PDF file
export function getPdfViewUrl(filename: string, jobId: string): string {
  return `/api/pdf/view/${encodeURIComponent(filename)}?jobId=${jobId}`;
}

// Get URL for downloading a PDF file
export function getPdfDownloadUrl(filename: string, jobId: string): string {
  return `/api/pdf/download/${encodeURIComponent(filename)}?jobId=${jobId}`;
}

export interface ProjectFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: string;
  downloadUrl: string | null;
  viewUrl: string | null;
}

export interface DirectoryListing {
  directory: string;
  files: ProjectFile[];
  parentDirectory: string | null;
}

// Get list of all files in a directory
export async function listDirectoryFiles(directory?: string): Promise<DirectoryListing> {
  try {
    const params = directory ? `?directory=${encodeURIComponent(directory)}` : '';
    const response = await apiRequest("GET", `/api/files/list${params}`, undefined);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to list directory files: ${(error as Error).message}`);
  }
}

// Delete a file
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await apiRequest("DELETE", `/api/files/delete?path=${encodeURIComponent(filePath)}`, undefined);
  } catch (error) {
    throw new Error(`Failed to delete file: ${(error as Error).message}`);
  }
}
