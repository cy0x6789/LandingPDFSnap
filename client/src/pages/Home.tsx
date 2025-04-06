import { useState } from "react";
import UrlInputForm from "@/components/UrlInputForm";
import ProcessingCard from "@/components/ProcessingCard";
import CompletionCard from "@/components/CompletionCard";
import ErrorCard from "@/components/ErrorCard";
import HelpSection from "@/components/HelpSection";

export type ProcessingStatus = "idle" | "processing" | "completed" | "error";

export interface UrlStatus {
  url: string;
  status: "pending" | "processing" | "complete" | "failed";
  filename?: string;
  error?: string;
}

export interface CompletionResults {
  successful: number;
  failed: number;
  outputPath: string;
}

export default function Home() {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const [urlStatuses, setUrlStatuses] = useState<UrlStatus[]>([]);
  const [outputPath, setOutputPath] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [completionResults, setCompletionResults] = useState<CompletionResults>({
    successful: 0,
    failed: 0,
    outputPath: "",
  });

  const handleReset = () => {
    setProcessingStatus("idle");
    setUrlStatuses([]);
    setErrorMessage("");
    setJobId("");
    setCompletionResults({
      successful: 0,
      failed: 0,
      outputPath: "",
    });
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setProcessingStatus("error");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">URL to PDF Converter</h1>
        <p className="text-gray-600">Convert web pages to PDF with a few clicks</p>
      </header>

      {processingStatus === "idle" && (
        <UrlInputForm 
          onStartProcessing={(urls, outputDir) => {
            setOutputPath(outputDir);
            setUrlStatuses(urls.map(url => ({ url, status: "pending" })));
            setProcessingStatus("processing");
          }} 
          onError={handleError}
        />
      )}

      {processingStatus === "processing" && (
        <ProcessingCard 
          urlStatuses={urlStatuses}
          setUrlStatuses={setUrlStatuses}
          outputPath={outputPath}
          onComplete={(results: CompletionResults, id?: string) => {
            console.log("Setting completion results:", results, "jobId:", id);
            setCompletionResults(results);
            setJobId(id || "");
            setProcessingStatus("completed");
          }}
          onCancel={handleReset}
          onError={handleError}
        />
      )}

      {processingStatus === "completed" && (
        <CompletionCard
          results={completionResults}
          onStartNew={handleReset}
          jobId={jobId}
          key={`completion-${jobId}`} // Add key to force re-render on new job
        />
      )}

      {processingStatus === "error" && (
        <ErrorCard 
          errorMessage={errorMessage}
          onTryAgain={handleReset}
        />
      )}

      <HelpSection />
    </div>
  );
}
