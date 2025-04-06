import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, RefreshCw, File, Loader2 } from "lucide-react";
import { listPdfFiles, PdfFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PdfFileListProps {
  jobId: string;
}

export default function PdfFileList({ jobId }: PdfFileListProps) {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<PdfFile | null>(null);
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const pdfFiles = await listPdfFiles(jobId);
      setFiles(pdfFiles);
      
      // Auto-select the first file if available
      if (pdfFiles.length > 0 && !selectedFile) {
        setSelectedFile(pdfFiles[0]);
      }
    } catch (err) {
      setError(`Failed to load PDF files: ${(err as Error).message}`);
      toast({
        title: "Error loading files",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [jobId]);

  const handleViewPdf = (file: PdfFile) => {
    setSelectedFile(file);
    // Open in a new tab
    window.open(file.viewUrl, '_blank');
  };

  const handleDownloadPdf = (file: PdfFile) => {
    // Trigger download
    window.location.href = file.downloadUrl;
  };

  const handleRefresh = () => {
    loadFiles();
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Generated PDFs</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="py-8 text-center">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading PDF files...</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-4 text-center text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-500">No PDF files found.</p>
          </div>
        )}

        {files.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border rounded-md p-1">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="font-medium text-sm">PDF Files</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className={`px-4 py-3 flex justify-between items-center border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${selectedFile?.name === file.name ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <File className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-mono truncate">{file.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-md p-4 flex flex-col justify-between">
              {selectedFile ? (
                <>
                  <div>
                    <h3 className="font-medium mb-2 truncate">{selectedFile.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 truncate">Path: {selectedFile.path}</p>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleViewPdf(selectedFile)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => handleDownloadPdf(selectedFile)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Select a PDF file to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-4">Preview</h3>
            <div className="aspect-video bg-gray-100 rounded overflow-hidden">
              <iframe 
                src={selectedFile.viewUrl} 
                className="w-full h-full border-0"
                title={`Preview of ${selectedFile.name}`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}