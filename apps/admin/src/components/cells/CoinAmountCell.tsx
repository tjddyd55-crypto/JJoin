import { formatCoin } from '../../lib/format';

type CoinAmountCellProps = {
  value: string | number | null | undefined;
  signed?: boolean;
};

export function CoinAmountCell({ value, signed = false }: CoinAmountCellProps) {
  const text = formatCoin(value);
  if (!signed) return <span className="coin-amount">{text}</span>;
  const n = Number(value);
  const prefix = !Number.isNaN(n) && n > 0 ? '+' : '';
  return (
    <span className={`coin-amount${n > 0 ? ' coin-positive' : ''}`}>
      {prefix}
      {text}
    </span>
  );
}
