'use client';

import React, { useState, useEffect } from 'react';
import { Asset, OrderSide, OrderType, UserOrder } from '@/lib/types';
import { useUserStore, useToastStore, useMarketStore } from '@/lib/store';
import { fmt, mapError } from '@/lib/formatters';
import { MarketConfirmDialog } from './MarketConfirmDialog';
import { AlertCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface OrderFormProps {
  asset: Asset;
  selectedPrice?: number | null;
}

export function OrderForm({ asset, selectedPrice }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [priceInput, setPriceInput] = useState<string>((asset.last_price / 100).toFixed(2));
  const [quantity, setQuantity] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { wallet, holdings, upsertOrder, setWallet } = useUserStore();
  const pushToast = useToastStore((s) => s.push);
  const addTrade = useMarketStore((s) => s.addTrade);

  const [isShaking, setIsShaking] = useState(false);

  // Sync clicked price from OrderBookLadder or Chart
  useEffect(() => {
    if (selectedPrice) {
      const p = Math.min(selectedPrice, asset.ceiling_price);
      setPriceInput((p / 100).toFixed(2));
      setType('LIMIT');
    }
  }, [selectedPrice, asset.ceiling_price]);

  const priceCents = Math.round(parseFloat(priceInput || '0') * 100);
  const userHolding = holdings.find((h) => h.asset_id === asset.id);
  const availableUnits = userHolding?.available_units ?? 0;
  const availableBalance = wallet?.available_balance ?? 0;

  // Validation
  const isCeilingExceeded = type === 'LIMIT' && priceCents > asset.ceiling_price;
  const estTotal = type === 'LIMIT' ? priceCents * quantity : asset.last_price * quantity;
  const hasInsufficientFunds = side === 'BUY' && estTotal > availableBalance;
  const hasInsufficientUnits = side === 'SELL' && quantity > availableUnits;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    if (asset.is_halted) {
      setInlineError('Trading is halted for this asset.');
      return;
    }

    if (quantity <= 0) {
      setInlineError('Quantity must be greater than zero.');
      return;
    }

    if (side === 'BUY') {
      if (hasInsufficientFunds) {
        setInlineError(
          mapError('INSUFFICIENT_FUNDS', {
            needed: fmt.price(estTotal),
            available: fmt.price(availableBalance),
          })
        );
        return;
      }
      if (isCeilingExceeded) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
        setInlineError(
          `Resale cap for this asset is ${fmt.price(asset.ceiling_price)} (120% of face value ${fmt.price(
            asset.face_value
          )}). Lower your price.`
        );
        return;
      }
    } else {
      if (availableUnits <= 0) {
        setInlineError('You hold none of this asset.');
        return;
      }
      if (hasInsufficientUnits) {
        setInlineError(
          mapError('INSUFFICIENT_HOLDINGS', { available: `${availableUnits}` })
        );
        return;
      }
    }

    if (type === 'MARKET') {
      setShowConfirm(true);
      return;
    }

    executeOrder();
  };

  const executeOrder = () => {
    setSubmitting(true);
    setShowConfirm(false);

    // Simulate network latency and server 202 acceptance
    setTimeout(() => {
      setSubmitting(false);

      const orderId = `ord-${Date.now().toString(36)}`;
      const newOrder: UserOrder = {
        id: orderId,
        asset_id: asset.id,
        asset_symbol: asset.symbol,
        asset_name: asset.name,
        side,
        type,
        price: type === 'LIMIT' ? priceCents : asset.last_price,
        quantity,
        filled_quantity: type === 'MARKET' ? quantity : 0,
        status: type === 'MARKET' ? 'FILLED' : 'OPEN',
        created_at: Date.now(),
        updated_at: Date.now(),
        reserved_amount: estTotal,
      };

      upsertOrder(newOrder);

      // Deduct balance or reserve
      if (side === 'BUY' && wallet) {
        setWallet({
          ...wallet,
          available_balance: wallet.available_balance - estTotal,
          reserved_balance: wallet.reserved_balance + (type === 'LIMIT' ? estTotal : 0),
        });
      }

      // If Market order, simulate match fill tick
      if (type === 'MARKET') {
        addTrade({
          id: `tr-${Date.now()}`,
          asset_id: asset.id,
          price: asset.last_price,
          quantity,
          side,
          timestamp: Date.now(),
          is_sim: false,
        });

        pushToast({
          variant: 'success',
          title: 'Order Filled',
          body: `Market ${side} for ${quantity} unit(s) executed at ${fmt.price(asset.last_price)}. Matched, settling.`,
        });
      } else {
        pushToast({
          variant: 'success',
          title: 'Order Accepted',
          body: `Limit ${side} resting on book for ${quantity} @ ${fmt.price(priceCents)}.`,
        });
      }
    }, 400);
  };

  return (
    <div className="surface p-5 rounded-3xl flex flex-col justify-between w-full">
      <div>
        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)] mb-4">
          <button
            type="button"
            onClick={() => { setSide('BUY'); setInlineError(null); }}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              side === 'BUY'
                ? 'bg-[var(--buy)] text-black shadow-buy'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Buy {asset.symbol}
          </button>
          <button
            type="button"
            onClick={() => { setSide('SELL'); setInlineError(null); }}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              side === 'SELL'
                ? 'bg-[var(--sell)] text-white shadow-sell'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Sell {asset.symbol}
          </button>
        </div>

        {/* Limit / Market Switcher */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-white">Order Type</span>
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setType('LIMIT')}
              className={`seg-tab ${type === 'LIMIT' ? 'active' : ''}`}
            >
              Limit
            </button>
            <button
              type="button"
              onClick={() => setType('MARKET')}
              className={`seg-tab ${type === 'MARKET' ? 'active' : ''}`}
            >
              Market
            </button>
          </div>
        </div>

        {/* Inline Error Message */}
        {inlineError && (
          <div className="p-3 mb-4 rounded-lg bg-[rgba(255,90,95,0.1)] border border-[rgba(255,90,95,0.3)] text-xs text-[var(--sell)] flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{inlineError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Price Input (for Limit) with Ticked Slider stopping at Cap */}
          {type === 'LIMIT' ? (
            <div className={isShaking ? 'animate-shake' : ''}>
              <div className="flex justify-between items-center mb-1">
                <label className="input-label mb-0">Limit Price ($)</label>
                <span className="text-[10px] font-mono text-[var(--cap)] font-bold">
                  Cap: {fmt.price(asset.ceiling_price)}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={priceInput}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  setInlineError(null);
                }}
                className={`input font-mono tabular text-sm w-full ${isCeilingExceeded ? 'border-[var(--cap)]' : ''}`}
              />
              
              {/* Ticked Price Slider stopping at Ceiling */}
              <div className="mt-2">
                <input
                  type="range"
                  min={Math.round(asset.face_value * 0.8) / 100}
                  max={asset.ceiling_price / 100}
                  step={0.5}
                  value={Math.min(parseFloat(priceInput || '0'), asset.ceiling_price / 100)}
                  onChange={(e) => setPriceInput(parseFloat(e.target.value).toFixed(2))}
                  className="w-full accent-[var(--lav)] cursor-pointer h-1.5 bg-[var(--inset)] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-[var(--muted)] mt-1">
                  <span>${(Math.round(asset.face_value * 0.8) / 100).toFixed(0)}</span>
                  <span className="text-white">Selected: ${parseFloat(priceInput || '0').toFixed(2)}</span>
                  <span className="text-[var(--cap)]">Max Cap: ${(asset.ceiling_price / 100).toFixed(2)}</span>
                </div>
              </div>

              {isCeilingExceeded && (
                <span className="text-[11px] text-[var(--cap)] mt-1.5 flex items-center gap-1 font-mono font-medium">
                  <ShieldAlert size={12} className="shrink-0" />
                  Resale cap for this asset is {fmt.price(asset.ceiling_price)} (120% of face value {fmt.price(asset.face_value)}). Lower your price.
                </span>
              )}
            </div>
          ) : (
            <div className="surface-2 p-3 rounded-xl border border-[var(--border)] text-xs">
              <span className="text-[var(--text-dim)] block mb-1">Execution Price</span>
              <span className="font-bold text-white">Best Available Market Liquidity</span>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="input-label mb-0">Quantity</label>
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-dim)]">
                {side === 'BUY' ? (
                  <>
                    <span>Avail:</span>
                    <span className="font-mono text-white">{fmt.price(availableBalance)}</span>
                  </>
                ) : (
                  <>
                    <span>Holdings:</span>
                    <span className="font-mono text-white">{availableUnits} units</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (side === 'BUY') {
                      const maxQ = Math.max(1, Math.min(asset.holding_cap, Math.floor(availableBalance / (priceCents || asset.last_price))));
                      setQuantity(maxQ);
                    } else {
                      setQuantity(Math.max(1, availableUnits));
                    }
                  }}
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-[rgba(255,255,255,0.08)] text-[var(--lav)] font-bold hover:bg-[rgba(255,255,255,0.15)]"
                >
                  MAX
                </button>
              </div>
            </div>
            <input
              type="number"
              min="1"
              max={side === 'BUY' ? asset.holding_cap : availableUnits || 1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="input font-mono tabular text-sm w-full"
            />
          </div>

          {/* Order Summary */}
          <div className="pt-2 border-t border-[var(--border)] text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-[var(--text-dim)]">
              <span>Est. Total:</span>
              <span className="text-white font-bold">{fmt.price(estTotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-dim)] text-[11px]">
              <span>Settlement:</span>
              <span className="text-[var(--buy)] font-medium">Immediate Reserve</span>
            </div>
          </div>

          {/* Lavender Submit Button (Section 5) */}
          <button
            type="submit"
            disabled={submitting || asset.is_halted}
            className="btn-primary w-full shadow-lg shadow-[rgba(185,167,255,0.2)] text-sm font-bold tracking-wide"
          >
            {submitting ? 'Submitting to Engine…' : `${side} ${quantity} ${asset.symbol}`}
          </button>
        </form>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] text-[10px] text-[var(--text-dim)] text-center">
        Double-entry ledger verified · Anti-scalping enforced
      </div>

      {/* Market Confirmation Dialog */}
      <MarketConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeOrder}
        asset={asset}
        side={side}
        quantity={quantity}
        worstPrice={asset.ceiling_price}
        estimatedCost={estTotal}
      />
    </div>
  );
}
