import React from 'react';
import { CheckCircle, Clock, MapPin, Phone, Truck, XCircle } from 'lucide-react';

export interface DeliveryOrder {
  _id: string;
  status: string;
  total?: number;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  } | string;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  };
  items?: any[];
  paymentMethod?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface DeliveryOrderCardProps {
  order: DeliveryOrder;
  tab: 'active' | 'completed';
  handleUpdateStatus?: (orderId: string, status: string) => void;
  setOtpModal?: (orderId: string) => void;
  setCancelModal?: (orderId: string) => void;
  currency?: string;
}

const statusColors: Record<string, string> = {
  Assigned: 'bg-blue-50 text-blue-700 border-blue-200',
  Packed: 'bg-amber-50 text-amber-700 border-amber-200',
  'Out for Delivery': 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({
  order,
  tab,
  handleUpdateStatus,
  setOtpModal,
  setCancelModal,
  currency = '$',
}) => {
  const user =
    typeof order.user === 'object' && order.user !== null
      ? order.user
      : { name: 'Customer', email: '', phone: '' };

  const shipping = order.shippingAddress || { address: 'Main St', city: 'Mumbai', state: 'MH', zip: '400050' };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            #{order._id.slice(-6).toUpperCase()}
          </span>
          <span
            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
              statusColors[order.status] || 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {order.status}
          </span>
        </div>
        <span className="text-sm font-black text-slate-900">
          {currency}
          {(order.total || 0).toFixed(2)}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3 text-xs">
        {/* Customer */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center border border-blue-100 text-xs shrink-0">
            {user.name?.charAt(0) || 'C'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{user.name || 'Customer'}</p>
            {user.phone && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" /> {user.phone}
              </p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="line-clamp-2">
            {shipping.address}, {shipping.city}, {shipping.state} {shipping.zip}
          </p>
        </div>

        {/* Items count */}
        <p className="text-[11px] text-slate-400">
          {order.items?.length || 1} item{(order.items?.length || 1) > 1 ? 's' : ''} •{' '}
          {(order.paymentMethod || 'COD').toUpperCase()}
        </p>
      </div>

      {/* Actions */}
      {tab === 'active' && (
        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/40">
          {(order.status === 'Assigned' || order.status === 'Packed') && handleUpdateStatus && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order._id, order.status === 'Assigned' ? 'Packed' : 'Out for Delivery')}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{order.status === 'Assigned' ? 'Mark Packed' : 'Out for Delivery'}</span>
            </button>
          )}

          {order.status === 'Out for Delivery' && setOtpModal && (
            <button
              type="button"
              onClick={() => setOtpModal(order._id)}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark Delivered</span>
            </button>
          )}

          {order.status !== 'Delivered' && order.status !== 'Cancelled' && setCancelModal && (
            <button
              type="button"
              onClick={() => setCancelModal(order._id)}
              className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Completed'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrderCard;
