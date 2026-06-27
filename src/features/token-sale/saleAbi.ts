export const SALE_ABI = [
  {
    type: "function",
    name: "saleInfo",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "stage", type: "uint8" },
          { name: "saleStart", type: "uint256" },
          { name: "saleEnd", type: "uint256" },
          { name: "saleAllocation", type: "uint256" },
          { name: "hardCap", type: "uint256" },
          { name: "totalDeposits", type: "uint256" },
          { name: "participants", type: "uint256" },
          { name: "finalized", type: "bool" },
          { name: "funded", type: "bool" },
          { name: "totalTokensSold", type: "uint256" },
          { name: "claimDeadline", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "userInfo",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "deposited", type: "uint256" },
          { name: "allocation", type: "uint256" },
          { name: "refund", type: "uint256" },
          { name: "tokensClaimed", type: "bool" },
          { name: "refundClaimed", type: "bool" },
          { name: "claimableTokens", type: "uint256" },
          { name: "claimableRefund", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimTokens",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "claimRefund",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;
