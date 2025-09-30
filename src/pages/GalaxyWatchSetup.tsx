import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Code, Server, Radio } from 'lucide-react';

const GalaxyWatchSetup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-primary/5 to-medical-info/5 p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Galaxy Watch 6 Integration Guide</h1>
          <p className="text-muted-foreground">
            Connect your Samsung Galaxy Watch 6 to the ER monitoring backend
          </p>
        </div>

        {/* API Endpoint */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              API Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge className="mb-2">POST Request</Badge>
              <code className="block bg-muted p-3 rounded text-sm">
                https://zxixippckhbivoewpxmx.supabase.co/functions/v1/patient-data
              </code>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                All requests must include the <code className="bg-muted px-1 py-0.5">x-api-key</code> header
                with your device's unique API key.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Request Format */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Request Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Headers</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`Content-Type: application/json
x-api-key: your_device_api_key_here`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">Body (JSON)</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "device_id": "GW6-ABCD1234",
  "timestamp": 1609459200000,
  "heart_rate": 75.5,
  "spo2": 98.0
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">Field Descriptions</h3>
              <ul className="space-y-2 text-sm">
                <li><code className="bg-muted px-1 py-0.5">device_id</code> (string, required): Your Galaxy Watch 6 identifier</li>
                <li><code className="bg-muted px-1 py-0.5">timestamp</code> (integer, required): Unix timestamp in milliseconds</li>
                <li><code className="bg-muted px-1 py-0.5">heart_rate</code> (float, required): Heart rate in BPM</li>
                <li><code className="bg-muted px-1 py-0.5">spo2</code> (float, optional): Blood oxygen saturation percentage</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Setup Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Setup Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 list-decimal list-inside">
              <li className="font-medium">
                Register Your Device
                <p className="text-sm text-muted-foreground ml-6 mt-1">
                  Go to the main dashboard and click "Register Device". Enter your Galaxy Watch 6 device ID
                  and link it to a patient. You'll receive an API key.
                </p>
              </li>
              
              <li className="font-medium">
                Configure Galaxy Watch App
                <p className="text-sm text-muted-foreground ml-6 mt-1">
                  In your Galaxy Watch 6 health monitoring app, configure the following:
                </p>
                <ul className="text-sm text-muted-foreground ml-6 mt-2 space-y-1">
                  <li>• API Endpoint URL (see above)</li>
                  <li>• Device ID (your unique identifier)</li>
                  <li>• API Key (from registration)</li>
                  <li>• Data transmission interval (recommended: 30-60 seconds)</li>
                </ul>
              </li>
              
              <li className="font-medium">
                Test Connection
                <p className="text-sm text-muted-foreground ml-6 mt-1">
                  Send a test request using curl or your preferred tool:
                </p>
                <pre className="bg-muted p-3 rounded text-xs mt-2 ml-6 overflow-x-auto">
{`curl -X POST https://zxixippckhbivoewpxmx.supabase.co/functions/v1/patient-data \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your_api_key_here" \\
  -d '{
    "device_id": "GW6-ABCD1234",
    "timestamp": '$(date +%s000)',
    "heart_rate": 75,
    "spo2": 98
  }'`}
                </pre>
              </li>

              <li className="font-medium">
                Monitor Data Stream
                <p className="text-sm text-muted-foreground ml-6 mt-1">
                  Return to the dashboard to see real-time data streaming from your Galaxy Watch 6.
                  Alerts will automatically trigger when thresholds are exceeded.
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">Critical</Badge>
                  <span className="font-medium">Heart Rate &gt; 140 BPM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-medical-warning text-white">Warning</Badge>
                  <span className="font-medium">Heart Rate &gt; 120 BPM</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">Critical</Badge>
                  <span className="font-medium">SpO₂ &lt; 88%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-medical-warning text-white">Warning</Badge>
                  <span className="font-medium">SpO₂ &lt; 92%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GalaxyWatchSetup;
