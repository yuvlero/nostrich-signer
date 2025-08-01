import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NostrKeys, createAndSignEvent, publishEvent } from '@/lib/nostr';

interface ServerChallengeData {
  id: string;
  challengeId: string;
  nwcUri: string;
  relay: string;
  secret: string;
}

interface ServerChallengeFlowProps {
  keys: NostrKeys | null;
  serverUrl: string;
}

export function ServerChallengeFlow({ keys, serverUrl }: ServerChallengeFlowProps) {
  const [challenge, setChallenge] = useState<ServerChallengeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();

  const generateChallenge = async () => {
    if (!serverUrl) {
      toast({
        title: "Server URL Required",
        description: "Please configure a server URL in settings",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setChallenge(null);
    setIsCompleted(false);

    try {
      const response = await fetch(`${serverUrl}/api/generate-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const challengeData: ServerChallengeData = await response.json();
      setChallenge(challengeData);
      
      toast({
        title: "Challenge Generated",
        description: `Challenge ID: ${challengeData.challengeId.substring(0, 16)}...`,
      });

    } catch (error) {
      console.error('Error generating challenge:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const signAndSubmit = async () => {
    if (!keys || !challenge) {
      toast({
        title: "Missing Requirements",
        description: "Keys and challenge are required",
        variant: "destructive",
      });
      return;
    }

    setIsSigning(true);

    try {
      // Create NWC-style data object for compatibility with existing signing function
      const nwcData = {
        challengeId: challenge.challengeId,
        relay: challenge.relay,
        secret: challenge.secret
      };

      // Create and sign the event
      const signedEvent = createAndSignEvent(keys.privateKey, keys.publicKey, nwcData);

      console.log('Generated signed event for server challenge:', signedEvent);
      console.log('Using exact challenge ID from server:', challenge.challengeId);

      // Publish to the server
      await publishEvent(signedEvent, serverUrl);

      setIsCompleted(true);
      toast({
        title: "Authentication Complete!",
        description: "Event signed and published successfully",
      });

    } catch (error) {
      console.error('Error signing/publishing event:', error);
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };

  const reset = () => {
    setChallenge(null);
    setIsCompleted(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Server Challenge Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!challenge && (
          <Button 
            onClick={generateChallenge} 
            disabled={isGenerating || !keys}
            className="w-full font-mono"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Challenge...
              </>
            ) : (
              'Generate New Challenge'
            )}
          </Button>
        )}

        {challenge && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <h3 className="font-mono font-semibold">Server Challenge</h3>
              <Badge variant="outline" className="font-mono">
                {challenge.challengeId.substring(0, 8)}...
              </Badge>
            </div>
            
            <div className="text-sm font-mono space-y-2">
              <div>
                <span className="text-muted-foreground">Challenge ID:</span>
                <br />
                <code className="bg-background px-1 py-0.5 rounded text-xs break-all">
                  {challenge.challengeId}
                </code>
              </div>
              
              <div>
                <span className="text-muted-foreground">Relay:</span>
                <br />
                <code className="bg-background px-1 py-0.5 rounded text-xs">
                  {challenge.relay}
                </code>
              </div>

              <div>
                <span className="text-muted-foreground">Secret:</span>
                <br />
                <code className="bg-background px-1 py-0.5 rounded text-xs break-all">
                  {challenge.secret}
                </code>
              </div>
            </div>

            {!isCompleted && (
              <div className="flex gap-2">
                <Button 
                  onClick={signAndSubmit} 
                  disabled={isSigning || !keys}
                  className="flex-1 font-mono"
                >
                  {isSigning ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Signing & Publishing...
                    </>
                  ) : (
                    'Sign & Submit Authentication'
                  )}
                </Button>
                
                <Button 
                  onClick={reset} 
                  variant="outline"
                  disabled={isSigning}
                  className="font-mono"
                >
                  Reset
                </Button>
              </div>
            )}

            {isCompleted && (
              <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-mono font-semibold text-green-700 dark:text-green-300">
                    Authentication Successful!
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Event published with challenge ID: {challenge.challengeId.substring(0, 16)}...
                </p>
                
                <Button 
                  onClick={reset} 
                  variant="outline"
                  size="sm"
                  className="mt-2 font-mono"
                >
                  Generate New Challenge
                </Button>
              </div>
            )}
          </div>
        )}

        {!keys && (
          <p className="text-sm text-muted-foreground text-center">
            Generate or import keys first to use server challenge authentication
          </p>
        )}
      </CardContent>
    </Card>
  );
}