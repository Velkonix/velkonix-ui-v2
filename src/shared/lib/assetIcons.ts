import wbtcIconUrl from "../../assets/asset-icons/wbtc.svg";
import wethIconUrl from "../../assets/asset-icons/weth.svg";
import usdtIconUrl from "../../assets/asset-icons/usdt.svg";

const ASSET_ICONS_BY_SYMBOL: Record<string, string> = {
  WBTC: wbtcIconUrl,
  WETH: wethIconUrl,
  USDT: usdtIconUrl,
};

export const getAssetIconBySymbol = (symbol?: string | null): string | null => {
  if (!symbol) {
    return null;
  }

  return ASSET_ICONS_BY_SYMBOL[symbol.toUpperCase()] ?? null;
};
