import btcIconUrl from "../../assets/asset-icons/btc.svg";
import usdeIconUrl from "../../assets/asset-icons/usde.svg";
import usdmIconUrl from "../../assets/asset-icons/usdm.svg";
import usdtIconUrl from "../../assets/asset-icons/usdt.svg";
import usdt0IconUrl from "../../assets/asset-icons/usdt0.svg";
import wbtcIconUrl from "../../assets/asset-icons/wbtc.svg";
import wethIconUrl from "../../assets/asset-icons/weth.svg";
import wstethIconUrl from "../../assets/asset-icons/wsteth.svg";

const ASSET_ICONS_BY_SYMBOL: Record<string, string> = {
  WBTC: wbtcIconUrl,
  BTC: btcIconUrl,
  "BTC.B": btcIconUrl,
  BTCB: btcIconUrl,
  WETH: wethIconUrl,
  ETH: wethIconUrl,
  WSTETH: wstethIconUrl,
  STETH: wstethIconUrl,
  USDT: usdtIconUrl,
  USDT0: usdt0IconUrl,
  USDM: usdmIconUrl,
  USDE: usdeIconUrl,
};

export const getAssetIconBySymbol = (symbol?: string | null): string | null => {
  if (!symbol) {
    return null;
  }

  return ASSET_ICONS_BY_SYMBOL[symbol.toUpperCase()] ?? null;
};
