import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileTextIcon, FolderOpenIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Updated schema with selected preset option
const formSchema = z.object({
  urls: z.string().min(1, { message: "Please enter at least one URL" }),
  outputPathPreset: z.string(),
  outputPath: z.string().min(1, { message: "Please specify an output directory" }),
});

type FormData = z.infer<typeof formSchema>;

// Preset paths for common locations
const OUTPUT_PRESETS = [
  { id: "generated-pdfs", label: "Generated PDFs", path: "./generated-pdfs" },
  { id: "downloads", label: "Downloads", path: "./downloads" },
  { id: "documents", label: "Documents", path: "./documents" },
  { id: "desktop", label: "Desktop", path: "./desktop" },
  { id: "custom", label: "Custom location...", path: "" },
];

interface UrlInputFormProps {
  onStartProcessing: (urls: string[], outputDir: string) => void;
  onError: (message: string) => void;
}

export default function UrlInputForm({ onStartProcessing, onError }: UrlInputFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomPath, setIsCustomPath] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      urls: "",
      outputPathPreset: "generated-pdfs",
      outputPath: "./generated-pdfs", // Default path
    },
  });

  // Handle preset selection change
  const handlePresetChange = (value: string) => {
    const preset = OUTPUT_PRESETS.find(p => p.id === value);
    form.setValue("outputPathPreset", value);
    
    if (value === "custom") {
      setIsCustomPath(true);
      // Don't auto-fill custom path, let user enter it
    } else {
      setIsCustomPath(false);
      if (preset) {
        form.setValue("outputPath", preset.path);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      // Parse the URLs (one per line)
      const urls = data.urls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url !== "");

      if (urls.length === 0) {
        toast({
          title: "No valid URLs",
          description: "Please enter at least one valid URL",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Validate URLs
      const invalidUrls = urls.filter((url) => {
        try {
          new URL(url);
          return false; // URL is valid
        } catch (e) {
          return true; // URL is invalid
        }
      });

      if (invalidUrls.length > 0) {
        toast({
          title: "Invalid URLs detected",
          description: `Please fix the following URLs: ${invalidUrls.join(", ")}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      onStartProcessing(urls, data.outputPath);
    } catch (error) {
      onError((error as Error).message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="urls"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">URLs to Convert (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="h-32 font-mono text-sm"
                      placeholder="https://example.com&#10;https://anotherexample.com"
                    />
                  </FormControl>
                  <p className="text-sm text-gray-500">Enter full URLs including https://</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Output location with presets */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="outputPathPreset"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="font-medium">Save Location</FormLabel>
                    <Select 
                      onValueChange={handlePresetChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OUTPUT_PRESETS.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show custom path input only when custom is selected */}
              {isCustomPath && (
                <FormField
                  control={form.control}
                  name="outputPath"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="font-medium">Custom Directory Path</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input
                            {...field}
                            className="font-mono text-sm"
                            placeholder="./path/to/save/pdfs"
                          />
                        </FormControl>
                      </div>
                      <p className="text-sm text-gray-500">Enter a relative path starting with ./ </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                <FileTextIcon className="mr-2 h-4 w-4" />
                Convert to PDF
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
