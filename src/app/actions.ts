"use server";

import solc from "solc";

type CompilationResult = {
  data?: {
    abi: any[];
    bytecode: string;
  } | null;
  error?: string | null;
};

function findFirstContract(output: any) {
    if (!output.contracts) return null;
    for (const fileName in output.contracts) {
        const fileContracts = output.contracts[fileName];
        for (const contractName in fileContracts) {
            const contract = fileContracts[contractName];
            if (contract.abi && contract.evm?.bytecode?.object) {
                return {
                    abi: contract.abi,
                    bytecode: contract.evm.bytecode.object,
                };
            }
        }
    }
    return null;
}

export async function compileSolidity(solidityCode: string): Promise<CompilationResult> {
  const input = {
    language: "Solidity",
    sources: {
      "Contract.sol": {
        content: solidityCode,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  try {
    const outputRaw = solc.compile(JSON.stringify(input));
    const output = JSON.parse(outputRaw);

    if (output.errors) {
      const errorMessages = output.errors
        .filter((err: any) => err.severity === 'error')
        .map((err: any) => err.formattedMessage)
        .join('\n');
      
      if (errorMessages) {
        return { error: errorMessages };
      }
    }

    const compiledContract = findFirstContract(output);

    if (!compiledContract) {
      return { error: "Could not find a valid contract with ABI and bytecode in the provided code." };
    }

    return {
      data: {
        abi: compiledContract.abi,
        bytecode: compiledContract.bytecode,
      },
    };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred during compilation." };
  }
}
