export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const WETH_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

export const POOL_ABI = [
  {
    type: "function",
    name: "getReservesList",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getUserAccountData",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "borrow",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "referralCode", type: "uint16" },
      { name: "onBehalfOf", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setUserUseReserveAsCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "useAsCollateral", type: "bool" },
    ],
    outputs: [],
  },
] as const;

export const AAVE_DATA_PROVIDER_ABI = [
  {
    type: "function",
    name: "getAllReservesTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "symbol", type: "string" },
          { name: "tokenAddress", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getReserveData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "unbacked", type: "uint256" },
      { name: "accruedToTreasuryScaled", type: "uint256" },
      { name: "totalAToken", type: "uint256" },
      { name: "totalStableDebt", type: "uint256" },
      { name: "totalVariableDebt", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "variableBorrowRate", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "averageStableBorrowRate", type: "uint256" },
      { name: "liquidityIndex", type: "uint256" },
      { name: "variableBorrowIndex", type: "uint256" },
      { name: "lastUpdateTimestamp", type: "uint40" },
    ],
  },
  {
    type: "function",
    name: "getReserveConfigurationData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "decimals", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "liquidationThreshold", type: "uint256" },
      { name: "liquidationBonus", type: "uint256" },
      { name: "reserveFactor", type: "uint256" },
      { name: "usageAsCollateralEnabled", type: "bool" },
      { name: "borrowingEnabled", type: "bool" },
      { name: "stableBorrowRateEnabled", type: "bool" },
      { name: "isActive", type: "bool" },
      { name: "isFrozen", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getReserveCaps",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "borrowCap", type: "uint256" },
      { name: "supplyCap", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getUserReserveData",
    stateMutability: "view",
    inputs: [
      { name: "asset", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "currentATokenBalance", type: "uint256" },
      { name: "currentStableDebt", type: "uint256" },
      { name: "currentVariableDebt", type: "uint256" },
      { name: "principalStableDebt", type: "uint256" },
      { name: "scaledVariableDebt", type: "uint256" },
      { name: "stableBorrowRate", type: "uint256" },
      { name: "liquidityRate", type: "uint256" },
      { name: "stableRateLastUpdated", type: "uint40" },
      { name: "usageAsCollateralEnabled", type: "bool" },
    ],
  },
] as const;

export const ORACLE_ABI = [
  {
    type: "function",
    name: "BASE_CURRENCY_UNIT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAssetPrice",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const AGGREGATED_RESERVE_DATA_COMPONENTS = [
  { name: "underlyingAsset", type: "address" },
  { name: "name", type: "string" },
  { name: "symbol", type: "string" },
  { name: "decimals", type: "uint256" },
  { name: "baseLTVasCollateral", type: "uint256" },
  { name: "reserveLiquidationThreshold", type: "uint256" },
  { name: "reserveLiquidationBonus", type: "uint256" },
  { name: "reserveFactor", type: "uint256" },
  { name: "usageAsCollateralEnabled", type: "bool" },
  { name: "borrowingEnabled", type: "bool" },
  { name: "isActive", type: "bool" },
  { name: "isFrozen", type: "bool" },
  { name: "liquidityIndex", type: "uint128" },
  { name: "variableBorrowIndex", type: "uint128" },
  { name: "liquidityRate", type: "uint128" },
  { name: "variableBorrowRate", type: "uint128" },
  { name: "lastUpdateTimestamp", type: "uint40" },
  { name: "aTokenAddress", type: "address" },
  { name: "variableDebtTokenAddress", type: "address" },
  { name: "interestRateStrategyAddress", type: "address" },
  { name: "availableLiquidity", type: "uint256" },
  { name: "totalScaledVariableDebt", type: "uint256" },
  { name: "priceInMarketReferenceCurrency", type: "uint256" },
  { name: "priceOracle", type: "address" },
  { name: "variableRateSlope1", type: "uint256" },
  { name: "variableRateSlope2", type: "uint256" },
  { name: "baseVariableBorrowRate", type: "uint256" },
  { name: "optimalUsageRatio", type: "uint256" },
  { name: "isPaused", type: "bool" },
  { name: "isSiloedBorrowing", type: "bool" },
  { name: "accruedToTreasury", type: "uint128" },
  { name: "isolationModeTotalDebt", type: "uint128" },
  { name: "flashLoanEnabled", type: "bool" },
  { name: "debtCeiling", type: "uint256" },
  { name: "debtCeilingDecimals", type: "uint256" },
  { name: "borrowCap", type: "uint256" },
  { name: "supplyCap", type: "uint256" },
  { name: "borrowableInIsolation", type: "bool" },
  { name: "virtualUnderlyingBalance", type: "uint128" },
  { name: "deficit", type: "uint128" },
] as const;

const BASE_CURRENCY_INFO_COMPONENTS = [
  { name: "marketReferenceCurrencyUnit", type: "uint256" },
  { name: "marketReferenceCurrencyPriceInUsd", type: "int256" },
  { name: "networkBaseTokenPriceInUsd", type: "int256" },
  { name: "networkBaseTokenPriceDecimals", type: "uint8" },
] as const;

const USER_RESERVE_DATA_COMPONENTS = [
  { name: "underlyingAsset", type: "address" },
  { name: "scaledATokenBalance", type: "uint256" },
  { name: "usageAsCollateralEnabledOnUser", type: "bool" },
  { name: "scaledVariableDebt", type: "uint256" },
] as const;

export const UI_POOL_DATA_PROVIDER_ABI = [
  {
    type: "function",
    name: "getReservesData",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: AGGREGATED_RESERVE_DATA_COMPONENTS,
      },
      {
        name: "",
        type: "tuple",
        components: BASE_CURRENCY_INFO_COMPONENTS,
      },
    ],
  },
  {
    type: "function",
    name: "getUserReservesData",
    stateMutability: "view",
    inputs: [
      { name: "provider", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: USER_RESERVE_DATA_COMPONENTS,
      },
      { name: "", type: "uint8" },
    ],
  },
] as const;

const REWARD_INFO_COMPONENTS = [
  { name: "rewardTokenSymbol", type: "string" },
  { name: "rewardTokenAddress", type: "address" },
  { name: "rewardOracleAddress", type: "address" },
  { name: "emissionPerSecond", type: "uint256" },
  { name: "incentivesLastUpdateTimestamp", type: "uint256" },
  { name: "tokenIncentivesIndex", type: "uint256" },
  { name: "emissionEndTimestamp", type: "uint256" },
  { name: "rewardPriceFeed", type: "int256" },
  { name: "rewardTokenDecimals", type: "uint8" },
  { name: "precision", type: "uint8" },
  { name: "priceFeedDecimals", type: "uint8" },
] as const;

const INCENTIVE_DATA_COMPONENTS = [
  { name: "tokenAddress", type: "address" },
  { name: "incentiveControllerAddress", type: "address" },
  { name: "rewardsTokenInformation", type: "tuple[]", components: REWARD_INFO_COMPONENTS },
] as const;

const AGGREGATED_RESERVE_INCENTIVE_DATA_COMPONENTS = [
  { name: "underlyingAsset", type: "address" },
  { name: "aIncentiveData", type: "tuple", components: INCENTIVE_DATA_COMPONENTS },
  { name: "vIncentiveData", type: "tuple", components: INCENTIVE_DATA_COMPONENTS },
] as const;

const USER_REWARD_INFO_COMPONENTS = [
  { name: "rewardTokenSymbol", type: "string" },
  { name: "rewardOracleAddress", type: "address" },
  { name: "rewardTokenAddress", type: "address" },
  { name: "userUnclaimedRewards", type: "uint256" },
  { name: "tokenIncentivesUserIndex", type: "uint256" },
  { name: "rewardPriceFeed", type: "int256" },
  { name: "priceFeedDecimals", type: "uint8" },
  { name: "rewardTokenDecimals", type: "uint8" },
] as const;

const USER_INCENTIVE_DATA_COMPONENTS = [
  { name: "tokenAddress", type: "address" },
  { name: "incentiveControllerAddress", type: "address" },
  { name: "userRewardsInformation", type: "tuple[]", components: USER_REWARD_INFO_COMPONENTS },
] as const;

const USER_RESERVE_INCENTIVE_DATA_COMPONENTS = [
  { name: "underlyingAsset", type: "address" },
  { name: "aTokenIncentivesUserData", type: "tuple", components: USER_INCENTIVE_DATA_COMPONENTS },
  { name: "vTokenIncentivesUserData", type: "tuple", components: USER_INCENTIVE_DATA_COMPONENTS },
] as const;

export const UI_INCENTIVE_DATA_PROVIDER_ABI = [
  {
    type: "function",
    name: "getReservesIncentivesData",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: AGGREGATED_RESERVE_INCENTIVE_DATA_COMPONENTS,
      },
    ],
  },
  {
    type: "function",
    name: "getUserReservesIncentivesData",
    stateMutability: "view",
    inputs: [
      { name: "provider", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: USER_RESERVE_INCENTIVE_DATA_COMPONENTS,
      },
    ],
  },
] as const;

export const WALLET_BALANCE_PROVIDER_ABI = [
  {
    type: "function",
    name: "batchBalanceOf",
    stateMutability: "view",
    inputs: [
      { name: "users", type: "address[]" },
      { name: "tokens", type: "address[]" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getUserWalletBalances",
    stateMutability: "view",
    inputs: [
      { name: "provider", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "", type: "address[]" },
      { name: "", type: "uint256[]" },
    ],
  },
] as const;
