import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FolderOpen, ArrowLeft, Loader2, FileSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompletionResults } from "@/pages/Home";
import PdfFileList from "./PdfFileList";
import FileExplorer from "./FileExplorer";
import { useState, useEffect } from "react";
import { listPdfFiles } from "@/lib/api";

interface CompletionCardProps {
  results: CompletionResults;
  onStartNew: () => void;
  jobId: string;
}

export default function CompletionCard({ results, onStartNew, jobId }: CompletionCardProps) {
  const { toast } = useToast();
  const [showFileList, setShowFileList] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [fileCount, setFileCount] = useState(0);
  
  console.log("CompletionCard received results:", results);
  
  // Always show loading initially and verify actual file count on component mount
  useEffect(() => {
    // Reset state when a new job ID is received
    setIsChecking(true);
    setFileCount(0);
    
    let isMounted = true;
    const checkInterval = setInterval(async () => {
      if (!jobId) {
        return;
      }
      
      try {
        console.log(`Checking files for job ${jobId}...`);
        const files = await listPdfFiles(jobId);
        
        if (isMounted) {
          setFileCount(files.length);
          
          // If we have files and they match the expected count, we can stop checking
          if (files.length > 0 && files.length >= results.successful) {
            clearInterval(checkInterval);
            setIsChecking(false);
            console.log(`Found ${files.length} files, stopping check interval`);
          }
        }
      } catch (error) {
        console.error("Error checking files:", error);
        if (isMounted) {
          toast({
            title: "Error",
            description: "Could not verify generated files",
            variant: "destructive"
          });
          clearInterval(checkInterval);
          setIsChecking(false);
        }
      }
    }, 1000); // Check every second until we find files
    
    // Initial check
    async function initialCheck() {
      if (!jobId) return;
      
      try {
        const files = await listPdfFiles(jobId);
        if (isMounted) {
          setFileCount(files.length);
          if (files.length > 0 && files.length >= results.successful) {
            clearInterval(checkInterval);
            setIsChecking(false);
          }
        }
      } catch (error) {
        console.error("Initial file check error:", error);
      }
    }
    
    initialCheck();
    
    return () => {
      isMounted = false;
      clearInterval(checkInterval);
    };
  }, [jobId, results.successful, toast]);
  
  const handleViewPdfs = () => {
    setShowFileList(true);
  };
  
  const handleBackToSummary = () => {
    setShowFileList(false);
    setShowFileExplorer(false);
  };
  
  const handleOpenFileExplorer = () => {
    setShowFileExplorer(true);
  };
  
  if (showFileExplorer) {
    return (
      <>
        <div className="mb-4">
          <Button 
            variant="outline" 
            className="flex items-center" 
            onClick={handleBackToSummary}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Summary
          </Button>
        </div>
        <FileExplorer 
          initialDirectory={results.outputPath} 
          onClose={handleBackToSummary}
        />
        <div className="text-center mt-4">
          <Button 
            variant="outline" 
            onClick={onStartNew}
          >
            Convert More URLs
          </Button>
        </div>
      </>
    );
  }
  
  if (showFileList) {
    return (
      <>
        <div className="mb-4 flex justify-between">
          <Button 
            variant="outline" 
            className="flex items-center" 
            onClick={handleBackToSummary}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Summary
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center" 
            onClick={handleOpenFileExplorer}
          >
            <FileSearch className="mr-2 h-4 w-4" />
            Open File Explorer
          </Button>
        </div>
        <PdfFileList jobId={jobId} />
        <div className="text-center mt-4">
          <Button 
            variant="outline" 
            onClick={onStartNew}
          >
            Convert More URLs
          </Button>
        </div>
      </>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-500 mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Conversion Complete</h2>
          
          {isChecking ? (
            <div className="flex items-center justify-center mt-2">
              <Loader2 className="h-5 w-5 text-gray-500 animate-spin mr-2" />
              <p className="text-gray-600">Checking files...</p>
            </div>
          ) : (
            <p className="text-gray-600 mt-1">
              {fileCount} PDFs successfully generated
              {results.failed > 0 ? `, ${results.failed} failed` : ""}
            </p>
          )}
          
          <p className="text-gray-500 text-sm mt-2">
            Files saved to: {results.outputPath}
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            className="w-full" 
            onClick={handleViewPdfs}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying Files...
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                View & Download PDFs
              </>
            )}
          </Button>
          
          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleOpenFileExplorer}
            >
              <FileSearch className="mr-2 h-4 w-4" />
              Browse All Files
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onStartNew}
            >
              Convert More URLs
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
