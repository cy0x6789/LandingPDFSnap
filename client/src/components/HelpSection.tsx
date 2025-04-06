import { Card, CardContent } from "@/components/ui/card";
import { InfoIcon } from "lucide-react";

export default function HelpSection() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
              1
            </div>
            <div className="ml-4">
              <h3 className="text-base font-medium text-gray-800">Enter URLs</h3>
              <p className="text-sm text-gray-600">Add one URL per line in the textarea above</p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
              2
            </div>
            <div className="ml-4">
              <h3 className="text-base font-medium text-gray-800">Choose Output Directory</h3>
              <p className="text-sm text-gray-600">Select where you want to save the generated PDFs</p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
              3
            </div>
            <div className="ml-4">
              <h3 className="text-base font-medium text-gray-800">Click Convert</h3>
              <p className="text-sm text-gray-600">The tool will navigate to each URL and save it as a PDF</p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Requirements</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This tool uses Playwright to generate PDFs. Please ensure Playwright is installed properly with browsers.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
