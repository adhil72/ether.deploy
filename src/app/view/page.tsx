"use client";

import { useState, useEffect, useTransition, Fragment } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ChevronRight, Home, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContractData {
    address: string;
    abi: any[];
}

interface FunctionInput {
    name: string;
    type: string;
}

interface ContractFunction {
    name: string;
    inputs: FunctionInput[];
    stateMutability: string;
    outputs: any[];
}

export default function ViewContractPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [contractAddress, setContractAddress] = useState("");
    const [contractAbi, setContractAbi] = useState("");
    
    const [contractData, setContractData] = useState<ContractData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [functionInputs, setFunctionInputs] = useState<Record<string, any>>({});
    const [functionOutputs, setFunctionOutputs] = useState<Record<string, any>>({});
    
    useEffect(() => {
        try {
            const storedData = sessionStorage.getItem("contractData");
            if (storedData) {
                const parsedData: ContractData = JSON.parse(storedData);
                setContractAddress(parsedData.address);
                setContractAbi(JSON.stringify(parsedData.abi, null, 2));
            }
        } catch (e) {
            // Ignore session storage errors
        }
    }, []);

    const handleLoadContract = () => {
        setError(null);
        setContractData(null);
        try {
            if (!ethers.isAddress(contractAddress)) {
                setError("Invalid contract address provided.");
                return;
            }
            const parsedAbi = JSON.parse(contractAbi);
            setContractData({ address: contractAddress, abi: parsedAbi });
            toast({ title: "Contract Loaded", description: "You can now interact with the functions below." });
        } catch (e: any) {
            setError("Invalid ABI. Please ensure it's a valid JSON array.");
            toast({ title: "Error", description: "Could not parse the ABI.", variant: "destructive" });
        }
    };


    const handleInputChange = (functionName: string, inputName: string, value: string) => {
        setFunctionInputs(prev => ({
            ...prev,
            [functionName]: {
                ...prev[functionName],
                [inputName]: value
            }
        }));
    };

    const handleFunctionCall = async (func: ContractFunction) => {
        if (!contractData || typeof window.ethereum === "undefined") {
            setError("Wallet not connected or contract data not available.");
            return;
        }

        setError(null);
        setFunctionOutputs(prev => ({...prev, [func.name]: null}));

        startTransition(async () => {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const contract = new ethers.Contract(contractData.address, contractData.abi, signer);

                const args = func.inputs.map(input => functionInputs[func.name]?.[input.name] || "");

                let result;
                if (func.stateMutability === "view" || func.stateMutability === "pure") {
                    result = await contract[func.name](...args);
                } else {
                    const tx = await contract[func.name](...args);
                    toast({ title: "Transaction Sent", description: `Tx Hash: ${tx.hash}` });
                    result = await tx.wait();
                    toast({ title: "Transaction Confirmed", description: "The transaction has been confirmed on the blockchain." });
                }

                let displayResult;
                if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
                     if(ethers.isBigInt(result)) {
                        displayResult = result.toString();
                     } else {
                        displayResult = JSON.stringify(result, null, 2);
                     }
                } else if (Array.isArray(result)) {
                    displayResult = JSON.stringify(result.map(item => ethers.isBigInt(item) ? item.toString() : item), null, 2);
                }
                 else {
                    displayResult = result.toString();
                }

                setFunctionOutputs(prev => ({...prev, [func.name]: displayResult }));
                toast({ title: "Success", description: `Function ${func.name} executed successfully.` });

            } catch (err: any) {
                const errorMessage = err.reason || err.message || "An unknown error occurred.";
                setError(`Error calling function ${func.name}: ${errorMessage}`);
                toast({
                    title: "Execution Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        });
    };

    const renderFunctions = (functions: ContractFunction[]) => {
        if (!functions || functions.length === 0) {
            return <p>No functions found in ABI.</p>;
        }

        return (
            <Accordion type="single" collapsible className="w-full">
                {functions.map((func) => (
                    <AccordionItem value={func.name} key={func.name}>
                        <AccordionTrigger>
                            <span className="font-code">{func.name}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 p-4 border-l-2 border-primary/50">
                                {func.inputs.map((input, index) => (
                                    <div key={`${func.name}-${input.name}-${index}`} className="space-y-2">
                                        <Label htmlFor={`${func.name}-${input.name}`} className="font-code text-sm">
                                            {input.name || `input_${index}`} ({input.type})
                                        </Label>
                                        <Input
                                            id={`${func.name}-${input.name}`}
                                            placeholder={`${input.type}`}
                                            value={functionInputs[func.name]?.[input.name] || ""}
                                            onChange={(e) => handleInputChange(func.name, input.name, e.target.value)}
                                            className="font-code"
                                        />
                                    </div>
                                ))}
                                <Button onClick={() => handleFunctionCall(func)} disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                                    {func.stateMutability === "view" || func.stateMutability === "pure" ? "Query" : "Transact"}
                                </Button>
                                {functionOutputs[func.name] && (
                                     <div className="mt-4 p-4 bg-secondary rounded-md">
                                        <p className="text-sm font-bold mb-2">Result:</p>
                                        <pre className="text-sm font-code break-all whitespace-pre-wrap">{functionOutputs[func.name]}</pre>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    };

    const contractFunctions = contractData?.abi.filter(item => item.type === 'function') as ContractFunction[] || [];
    const readFunctions = contractFunctions.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure');
    const writeFunctions = contractFunctions.filter(f => f.stateMutability !== 'view' && f.stateMutability !== 'pure');

    return (
        <main className="container mx-auto px-4 py-8 md:py-12">
            <div className="max-w-3xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-headline font-bold text-heading">
                        Contract Viewer
                    </h1>
                     <Button variant="outline" onClick={() => router.push('/')}>
                        <Home className="mr-2 h-4 w-4" />
                        Back to Deploy
                    </Button>
                </header>
                
                 <Card className="shadow-lg mb-8">
                    <CardHeader>
                        <CardTitle>Load Contract</CardTitle>
                        <CardDescription>Enter a contract address and its ABI to interact with it.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                           <Label htmlFor="contract-address">Contract Address</Label>
                           <Input 
                                id="contract-address"
                                placeholder="0x..."
                                value={contractAddress}
                                onChange={e => setContractAddress(e.target.value)}
                                className="font-code"
                           />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor="contract-abi">Contract ABI</Label>
                           <Textarea 
                                id="contract-abi"
                                placeholder='[{"inputs": [], "name": "myFunction", ...}]'
                                value={contractAbi}
                                onChange={e => setContractAbi(e.target.value)}
                                className="font-code min-h-[150px]"
                           />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleLoadContract} disabled={!contractAddress || !contractAbi}>
                            <Search className="mr-2 h-4 w-4" />
                            Load Contract
                        </Button>
                    </CardFooter>
                </Card>

                {error && (
                    <Alert variant="destructive" className="mb-8">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                
                {contractData && (
                    <div className="space-y-8 mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Read Functions</CardTitle>
                                <CardDescription>Query data from the contract at <code className="font-code text-sm">{contractData.address}</code></CardDescription>
                            </CardHeader>
                             <CardContent>
                                {readFunctions.length > 0 ? renderFunctions(readFunctions) : <p className="text-sm text-muted-foreground">No read functions in this contract.</p>}
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Write Functions</CardTitle>
                                <CardDescription>Send transactions to modify contract state.</CardDescription>
                            </CardHeader>
                             <CardContent>
                                {writeFunctions.length > 0 ? renderFunctions(writeFunctions) : <p className="text-sm text-muted-foreground">No write functions in this contract.</p>}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </main>
    );
}
