import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePdfs, cancelPdfGeneration } from "@/lib/api";
import { UrlStatus, CompletionResults } from "@/pages/Home";
import FileExplorer from "@/components/FileExplorer";

interface ProcessingCardProps {
  urlStatuses: UrlStatus[];
  setUrlStatuses: React.Dispatch<React.SetStateAction<UrlStatus[]>>;
  outputPath: string;
  onComplete: (results: CompletionResults, jobId?: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export default function ProcessingCard({
  urlStatuses,
  setUrlStatuses,
  outputPath,
  onComplete,
  onCancel,
  onError,
}: ProcessingCardProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  
  // Calculate progress percentage
  const progressPercentage = urlStatuses.length > 0
    ? ((urlStatuses.filter(u => u.status === "complete" || u.status === "failed").length) / urlStatuses.length) * 100
    : 0;
  
  const currentUrl = currentIndex < urlStatuses.length ? urlStatuses[currentIndex].url : "";
  
  useEffect(() => {
    const processUrls = async () => {
      try {
        // Use a local variable to store jobId from the API response
        let apiJobId: string | undefined;
        
        const results = await generatePdfs(
          urlStatuses.map(u => u.url),
          outputPath,
          (index, status, error) => {
            setUrlStatuses(prev => {
              const newStatuses = [...prev];
              newStatuses[index] = {
                ...newStatuses[index],
                status: status as "pending" | "processing" | "complete" | "failed",
                error: error
              };
              return newStatuses;
            });
            
            if (status === "processing") {
              setCurrentIndex(index);
            }
            
            // Only mark as complete when the job status is "completed"
            if (status === "completed") {
              console.log("Job completed from server, marking as complete");
              
              // Get counts directly from the API response instead of our local state
              const successCount = results?.successCount || 0;
              const failCount = results?.failCount || 0;
              
              console.log("Marking as complete with results:", { 
                successful: successCount, 
                failed: failCount, 
                outputPath 
              });
              
              // Use the stored API job ID for the callback
              onComplete({
                successful: successCount,
                failed: failCount,
                outputPath
              }, apiJobId);
            }
          }
        );
        
        // Store the job ID for potential cancellation
        if (results && results.jobId) {
          apiJobId = results.jobId;
          setJobId(results.jobId);
        }
      } catch (error) {
        onError((error as Error).message || "Failed to process URLs");
      }
    };
    
    processUrls();
    
    return () => {
      // Cleanup - cancel the operation if component unmounts
      if (jobId) {
        cancelPdfGeneration(jobId).catch(console.error);
      }
    };
  }, []);
  
  const handleCancel = async () => {
    if (!jobId) {
      toast({
        title: "Cannot cancel",
        description: "No active job to cancel",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsCancelling(true);
      await cancelPdfGeneration(jobId);
      onCancel();
    } catch (error) {
      toast({
        title: "Error cancelling",
        description: "Failed to cancel PDF generation",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };
  
  const handleOpenFolder = () => {
    setShowFileExplorer(true);
  };

  const completedCount = urlStatuses.filter(u => u.status === "complete" || u.status === "failed").length;
  
  if (showFileExplorer) {
    return (
      <FileExplorer 
        initialDirectory={outputPath} 
        onClose={() => setShowFileExplorer(false)}
      />
    );
  }
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Processing URLs</h2>
        
        {/* Progress section */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              Processing: {currentUrl}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {completedCount}/{urlStatuses.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Status list */}
        <div className="border rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex justify-between">
              <span className="font-medium text-sm">URL</span>
              <span className="font-medium text-sm">Status</span>
            </div>
          </div>
          
          <div className="divide-y">
            {urlStatuses.map((urlStatus, index) => (
              <div key={index} className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-mono truncate max-w-xs">{urlStatus.url}</span>
                <StatusBadge status={urlStatus.status} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isCancelling}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={onCancel} 
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          {progressPercentage > 0 && (
            <Button 
              onClick={handleOpenFolder}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Folder
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
          Complete
        </span>
      );
    case "processing":
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 flex items-center">
          <div className="h-2 w-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
          Processing
        </span>
      );
    case "failed":
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
          Failed
        </span>
      );
    default:
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
          Pending
        </span>
      );
  }
}
