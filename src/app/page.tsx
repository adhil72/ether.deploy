"use client";

import { useState, useTransition, type FC } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { compileSolidity } from "./actions";
import CodeOutput from "@/components/code-output";
import { Loader2, AlertTriangle, Wallet, Check, Copy, UploadCloud, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

type CompilationOutput = {
  abi: any[];
  bytecode: string;
};

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();
  const [isCompilePending, startCompileTransition] = useTransition();
  const [isDeployPending, startDeployTransition] = useTransition();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [solidityCode, setSolidityCode] = useState<string>("");
  const [compilationOutput, setCompilationOutput] = useState<CompilationOutput | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        setError(null);
        toast({
            title: "Wallet Connected",
            description: `Connected to address: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        });
      } catch (err: any) {
        setError("Failed to connect wallet. Please make sure MetaMask is unlocked.");
        toast({
            title: "Wallet Connection Error",
            description: err.message,
            variant: "destructive",
        });
      }
    } else {
      setError("MetaMask is not installed. Please install it to continue.");
      toast({
          title: "MetaMask Not Found",
          description: "Please install the MetaMask browser extension.",
          variant: "destructive",
      });
    }
  };

  const handleCompile = () => {
    if (!solidityCode.trim()) {
      setError("Solidity code cannot be empty.");
      return;
    }
    setError(null);
    setCompilationOutput(null);
    setDeployedAddress(null);

    startCompileTransition(async () => {
      const result = await compileSolidity(solidityCode);
      if (result.error) {
        setError(result.error);
        toast({
            title: "Compilation Failed",
            description: result.error,
            variant: "destructive",
        });
      } else if (result.data) {
        setCompilationOutput(result.data);
        toast({
            title: "Compilation Successful",
            description: "ABI and Bytecode are ready.",
        });
      }
    });
  };

  const handleDeploy = async () => {
    if (!compilationOutput || !walletAddress) {
        setError("Please compile your code and connect your wallet before deploying.");
        return;
    }
    setError(null);
    setDeployedAddress(null);

    startDeployTransition(async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const factory = new ethers.ContractFactory(compilationOutput.abi, compilationOutput.bytecode, signer);
            
            toast({
                title: "Deploying Contract",
                description: "Please confirm the transaction in MetaMask.",
            });

            const contract = await factory.deploy();
            await contract.waitForDeployment();
            
            const address = await contract.getAddress();
            setDeployedAddress(address);

            if (typeof window !== "undefined") {
              sessionStorage.setItem("contractData", JSON.stringify({
                address: address,
                abi: compilationOutput.abi
              }));
            }

            toast({
                title: "Deployment Successful!",
                description: `Contract deployed at address: ${address}`,
            });
        } catch (err: any) {
            const errorMessage = err.message || "An unknown error occurred during deployment.";
            setError(`Deployment failed: ${errorMessage}`);
            toast({
                title: "Deployment Error",
                description: errorMessage,
                variant: "destructive",
            });
        }
    });
  };
  
  const copyAddress = () => {
    if(!deployedAddress) return;
    navigator.clipboard.writeText(deployedAddress);
    setIsAddressCopied(true);
    setTimeout(() => setIsAddressCopied(false), 2000);
  }

  const handleViewContract = () => {
    router.push('/view');
  }

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-10">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-heading mb-4 sm:mb-0">
            EthDeploy
          </h1>
          <Button onClick={handleConnectWallet} disabled={!!walletAddress}>
            <Wallet className="mr-2 h-4 w-4" />
            {walletAddress ? `Connected: ${walletAddress.substring(0, 6)}...` : "Connect Wallet"}
          </Button>
        </header>

        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">1. Input Solidity Code</CardTitle>
              <CardDescription>Paste your .sol file content below.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="pragma solidity ^0.8.20; ..."
                className="min-h-[250px] font-code bg-white dark:bg-gray-900/50"
                value={solidityCode}
                onChange={(e) => setSolidityCode(e.target.value)}
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleCompile} disabled={isCompilePending || !solidityCode}>
                {isCompilePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isCompilePending ? "Compiling..." : "Compile"}
              </Button>
            </CardFooter>
          </Card>

          {error && (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {compilationOutput && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-headline">2. Compilation Output</CardTitle>
                <CardDescription>
                  Your contract's ABI and Bytecode are ready. You can now deploy to the network.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeOutput
                  abi={JSON.stringify(compilationOutput.abi, null, 2)}
                  bytecode={compilationOutput.bytecode}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={handleDeploy} disabled={isDeployPending || !walletAddress}>
                   {isDeployPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                   {isDeployPending ? "Deploying..." : "Deploy Contract"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {deployedAddress && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">3. Deployment Complete!</CardTitle>
                    <CardDescription>Your contract has been successfully deployed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">Contract Address:</p>
                    <div className="flex items-center gap-2 p-3 rounded-md border bg-secondary">
                        <code className="font-code text-sm break-all">{deployedAddress}</code>
                        <Button variant="ghost" size="icon" onClick={copyAddress} className="ml-auto shrink-0">
                           {isAddressCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleViewContract}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Contract
                    </Button>
                </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
