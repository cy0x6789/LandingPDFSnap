import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Eye, 
  RefreshCw, 
  File as FileIcon, 
  Folder, 
  FolderOpen, 
  ChevronUp, 
  Trash2, 
  Loader2 
} from "lucide-react";
import { listDirectoryFiles, deleteFile, ProjectFile, DirectoryListing } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/utils";
import { format } from "date-fns";

interface FileExplorerProps {
  initialDirectory?: string;
  onClose?: () => void;
}

export default function FileExplorer({ initialDirectory, onClose }: FileExplorerProps) {
  const [directoryListing, setDirectoryListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { toast } = useToast();

  const loadFiles = async (directory?: string) => {
    try {
      setLoading(true);
      setError(null);
      const listing = await listDirectoryFiles(directory);
      setDirectoryListing(listing);
      setSelectedFile(null);
    } catch (err) {
      setError(`Failed to load files: ${(err as Error).message}`);
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
    loadFiles(initialDirectory);
  }, [initialDirectory]);

  const handleNavigateToParent = () => {
    if (directoryListing?.parentDirectory) {
      loadFiles(directoryListing.parentDirectory);
    }
  };

  const handleNavigateToDirectory = (dir: ProjectFile) => {
    if (dir.isDirectory) {
      loadFiles(dir.path);
    }
  };

  const handleViewFile = (file: ProjectFile) => {
    if (!file.isDirectory && file.viewUrl) {
      setSelectedFile(file);
      setPreviewOpen(true);
    }
  };

  const handleDownloadFile = (file: ProjectFile) => {
    if (!file.isDirectory && file.downloadUrl) {
      window.location.href = file.downloadUrl;
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;
    
    try {
      setDeletingFile(true);
      await deleteFile(selectedFile.path);
      
      toast({
        title: "File deleted",
        description: `${selectedFile.name} has been deleted successfully.`,
      });
      
      // Refresh the file list
      loadFiles(directoryListing?.directory);
      setDeleteConfirmOpen(false);
    } catch (err) {
      toast({
        title: "Error deleting file",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeletingFile(false);
    }
  };

  const confirmDeleteFile = (file: ProjectFile) => {
    setSelectedFile(file);
    setDeleteConfirmOpen(true);
  };

  const handleRefresh = () => {
    loadFiles(directoryListing?.directory);
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">File Explorer</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {onClose && (
                <Button size="sm" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Path navigation */}
          {directoryListing && (
            <div className="flex items-center mb-4 overflow-x-auto py-2">
              <Badge variant="outline" className="px-3 py-1 mb-0">
                Current: {directoryListing.directory}
              </Badge>
              
              {directoryListing.parentDirectory && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNavigateToParent}
                  className="ml-2"
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Up
                </Button>
              )}
            </div>
          )}

          {loading && (
            <div className="py-8 text-center">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Loading files...</p>
            </div>
          )}

          {error && !loading && (
            <div className="py-4 text-center text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && directoryListing && directoryListing.files.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">No files found in this directory.</p>
            </div>
          )}

          {!loading && !error && directoryListing && directoryListing.files.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b grid grid-cols-12 gap-2">
                <div className="col-span-6 font-medium text-sm">Name</div>
                <div className="col-span-2 font-medium text-sm">Size</div>
                <div className="col-span-2 font-medium text-sm">Modified</div>
                <div className="col-span-2 font-medium text-sm text-right">Actions</div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {directoryListing.files.map((file, index) => (
                  <div 
                    key={index} 
                    className="px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors grid grid-cols-12 gap-2 items-center"
                  >
                    <div 
                      className="col-span-6 flex items-center space-x-2 truncate cursor-pointer"
                      onClick={() => file.isDirectory 
                        ? handleNavigateToDirectory(file) 
                        : handleViewFile(file)
                      }
                    >
                      {file.isDirectory ? (
                        <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    
                    <div className="col-span-2 text-sm text-gray-500">
                      {file.isDirectory ? '--' : formatFileSize(file.size)}
                    </div>
                    
                    <div className="col-span-2 text-sm text-gray-500">
                      {file.modifiedTime ? format(new Date(file.modifiedTime), 'MM/dd/yyyy') : '--'}
                    </div>
                    
                    <div className="col-span-2 flex justify-end space-x-1">
                      {!file.isDirectory && file.viewUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {!file.isDirectory && file.downloadUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {!file.isDirectory && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => confirmDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedFile?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deletingFile}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFile}
              disabled={deletingFile}
            >
              {deletingFile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* File preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>File Preview: {selectedFile?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedFile?.viewUrl && (
            <div className="w-full h-[70vh] bg-gray-100 rounded overflow-hidden">
              <iframe 
                src={selectedFile.viewUrl} 
                className="w-full h-full border-0"
                title={`Preview of ${selectedFile.name}`}
              />
            </div>
          )}
          
          <DialogFooter>
            {selectedFile?.downloadUrl && (
              <Button 
                variant="outline" 
                onClick={() => handleDownloadFile(selectedFile)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}