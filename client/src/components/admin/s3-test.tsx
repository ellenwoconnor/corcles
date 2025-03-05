
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function S3TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState({
    connection: false,
    config: false,
    upload: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      setIsLoading(prev => ({ ...prev, connection: true }));
      const response = await apiRequest("GET", "/api/admin/test-s3");
      const data = await response.json();
      setConnectionStatus(data);
      
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error testing S3 connection:", error);
      setConnectionStatus({ success: false, message: "Failed to test connection", error });
      toast({
        title: "Error",
        description: "Failed to test S3 connection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, connection: false }));
    }
  };

  const checkConfig = async () => {
    try {
      setIsLoading(prev => ({ ...prev, config: true }));
      const response = await apiRequest("GET", "/api/admin/check-s3-config");
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      console.error("Error checking S3 config:", error);
      setConfigStatus({ success: false, message: "Failed to check configuration", error });
      toast({
        title: "Error",
        description: "Failed to check S3 configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, config: false }));
    }
  };

  const uploadTestFile = async () => {
    if (!fileInputRef.current?.files?.length) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("testFile", file);

    try {
      setIsLoading(prev => ({ ...prev, upload: true }));
      setUploadResult(null);
      
      const response = await apiRequest("POST", "/api/admin/test-s3-upload", formData);
      const data = await response.json();
      
      setUploadResult(data);
      toast({
        title: data.success ? "Upload Successful" : "Upload Failed",
        description: data.success ? `File uploaded: ${data.fileUrl}` : data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error uploading test file:", error);
      setUploadResult({ success: false, message: "Failed to upload file", error });
      toast({
        title: "Error",
        description: "Failed to upload test file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, upload: false }));
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Digital Ocean Spaces Integration Test</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Check S3 Configuration</CardTitle>
            <CardDescription>
              Verify that your S3-compatible storage environment variables are correctly set up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkConfig} disabled={isLoading.config}>
              {isLoading.config ? "Checking..." : "Check Configuration"}
            </Button>
            
            {configStatus && (
              <div className="mt-4">
                <Alert variant={configStatus.isConfigured ? "default" : "destructive"}>
                  <AlertTitle>
                    {configStatus.isConfigured ? "Configuration Ready" : "Configuration Incomplete"}
                  </AlertTitle>
                  <AlertDescription>
                    {configStatus.isConfigured 
                      ? "Digital Ocean Spaces is properly configured" 
                      : "Digital Ocean Spaces configuration is incomplete. Check your environment variables."}
                  </AlertDescription>
                </Alert>
                
                {configStatus.environment && (
                  <div className="mt-4 bg-muted p-4 rounded">
                    <h4 className="font-semibold mb-2">Environment Variables</h4>
                    <ul className="space-y-1">
                      {Object.entries(configStatus.environment).map(([key, value]: [string, any]) => (
                        <li key={key}>
                          {key}: {value === true ? "✅ Set" : value === false ? "❌ Missing" : value}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      Active Storage: <span className="font-semibold">{configStatus.activeStorage}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test S3 Connection</CardTitle>
            <CardDescription>
              Test your connection to Digital Ocean Spaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testConnection} disabled={isLoading.connection}>
              {isLoading.connection ? "Testing..." : "Test Connection"}
            </Button>
            
            {connectionStatus && (
              <div className="mt-4">
                <Alert variant={connectionStatus.success ? "default" : "destructive"}>
                  <AlertTitle>
                    {connectionStatus.success ? "Connection Successful" : "Connection Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {connectionStatus.message}
                    {connectionStatus.error && (
                      <div className="mt-2 text-xs overflow-auto max-h-32 bg-muted p-2 rounded">
                        {JSON.stringify(connectionStatus.error, null, 2)}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test File Upload</CardTitle>
            <CardDescription>
              Upload a test file to verify that your Digital Ocean Spaces is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input 
                type="file" 
                ref={fileInputRef}
                className="max-w-sm" 
              />
              <Button onClick={uploadTestFile} disabled={isLoading.upload}>
                {isLoading.upload ? "Uploading..." : "Upload Test File"}
              </Button>
            </div>
            
            {uploadResult && (
              <div className="mt-4">
                <Alert variant={uploadResult.success ? "default" : "destructive"}>
                  <AlertTitle>
                    {uploadResult.success ? "Upload Successful" : "Upload Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {uploadResult.message}
                    
                    {uploadResult.success && uploadResult.fileUrl && (
                      <div className="mt-2">
                        <p className="mb-1">File URL:</p>
                        <a 
                          href={uploadResult.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-500 break-all"
                        >
                          {uploadResult.fileUrl}
                        </a>
                        
                        {uploadResult.fileDetails && (
                          <div className="mt-2 text-sm">
                            <p>File name: {uploadResult.fileDetails.originalName}</p>
                            <p>Size: {(uploadResult.fileDetails.size / 1024).toFixed(2)} KB</p>
                            <p>Type: {uploadResult.fileDetails.mimetype}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {uploadResult.error && (
                      <div className="mt-2 text-xs overflow-auto max-h-32 bg-muted p-2 rounded">
                        {JSON.stringify(uploadResult.error, null, 2)}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
