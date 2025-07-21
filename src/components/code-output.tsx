"use client";

import { useState, type FC } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy } from "lucide-react";

interface CodeOutputProps {
  abi: string;
  bytecode: string;
}

const CopyButton: FC<{ textToCopy: string }> = ({ textToCopy }) => {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} className="absolute top-2 right-2">
      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only">Copy</span>
    </Button>
  );
};


const CodeOutput: FC<CodeOutputProps> = ({ abi, bytecode }) => {
  return (
    <Tabs defaultValue="abi" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="abi">ABI</TabsTrigger>
        <TabsTrigger value="bytecode">Bytecode</TabsTrigger>
      </TabsList>
      <TabsContent value="abi">
        <div className="relative rounded-md bg-secondary p-4 mt-2">
          <CopyButton textToCopy={abi} />
          <pre className="text-sm font-code overflow-x-auto max-h-[300px] p-2 pr-12">
            <code>{abi}</code>
          </pre>
        </div>
      </TabsContent>
      <TabsContent value="bytecode">
        <div className="relative rounded-md bg-secondary p-4 mt-2">
          <CopyButton textToCopy={bytecode} />
          <pre className="text-sm font-code break-all whitespace-pre-wrap overflow-x-auto max-h-[300px] p-2 pr-12">
            <code>{bytecode}</code>
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default CodeOutput;
