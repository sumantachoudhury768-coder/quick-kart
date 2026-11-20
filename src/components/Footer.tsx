import { Link } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import { SEED_CATEGORIES } from '../data/seedCatalog';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/60 mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-lg font-bold text-slate-900"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>QuickKart</span>
            </Link>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Fresh groceries, hostel essentials, and everyday necessities delivered fast to students, families, and working professionals across Dehradun.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Delivery hours: 7:00 AM – 11:00 PM daily
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Popular Categories</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {SEED_CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/catalogue/${cat.slug}`}
                    className="hover:text-emerald-700 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Daily Essentials</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {SEED_CATEGORIES.slice(4, 8).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/catalogue/${cat.slug}`}
                    className="hover:text-emerald-700 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Customer Service</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/catalogue" className="hover:text-emerald-700 transition-colors">
                  Browse Full Catalogue
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-emerald-700 transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-700 transition-colors">
                  My Orders &amp; Addresses
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-emerald-700 transition-colors">
                  Checkout
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} QuickKart Grocery Delivery. Serving Dehradun, Uttarakhand.</p>
          <p>Free doorstep delivery on orders above ₹299 · Cash on Delivery available</p>
        </div>
      </div>
    </footer>
  );
}
