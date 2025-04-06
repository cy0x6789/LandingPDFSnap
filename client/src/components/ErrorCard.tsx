import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ErrorCardProps {
  errorMessage: string;
  onTryAgain: () => void;
}

export default function ErrorCard({ errorMessage, onTryAgain }: ErrorCardProps) {
  return (
    <Card className="mb-6 border-l-4 border-red-500">
      <CardContent className="pt-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{errorMessage}</p>
            </div>
            <div className="mt-4">
              <Button 
                variant="destructive" 
                onClick={onTryAgain}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
