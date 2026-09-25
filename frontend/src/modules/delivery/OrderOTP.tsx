import React from 'react';
import { KeyRound } from 'lucide-react';

export interface OrderOTPProps {
  order: {
    status?: string;
    deliveryOtp?: string;
    [key: string]: any;
  };
  className?: string;
}

export const OrderOTP: React.FC<OrderOTPProps> = ({ order, className = '' }) => {
  const showOtp =
    order?.deliveryOtp &&
    ['Assigned', 'Packed', 'Out for Delivery', 'PENDING', 'ACCEPTED', 'EN_ROUTE'].includes(order.status || '');

  if (!showOtp) return null;

  return (
    <div
      className={`bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/15 ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white shrink-0 border border-white/30">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-sm tracking-tight">Delivery Verification OTP</h3>
          <p className="text-xs text-emerald-100">Share this 6-digit PIN with your delivery partner upon arrival</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 select-all">
        {order.deliveryOtp.split('').map((digit: string, i: number) => (
          <div
            key={i}
            className="flex-1 max-w-[48px] h-12 rounded-xl bg-white/20 backdrop-blur border border-white/40 flex items-center justify-center text-xl font-mono font-black tracking-wider shadow-xs"
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderOTP;
