import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';

export function Navbar() {
  const { firebaseUser, profile, isAdmin, openAuthModal } = useAuth();
  const { cartTotals, openCartDrawer } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue');
    setMobileMenuOpen(false);
  };

  const isOffersView = location.pathname.startsWith('/catalogue') && location.search.includes('offers=1');

  const navLinkClass = (path: string) => {
    const active =
      path === '/catalogue'
        ? location.pathname.startsWith('/catalogue') && !isOffersView
        : location.pathname === path;
    return `text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
      active ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'
    }`;
  };

  const firstName = (profile?.name || firebaseUser?.displayName || 'Account').split(' ')[0];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-6">
        {/* Brand Zone */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <ShoppingBasket className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span>QuickKart</span>
        </Link>

        {/* Search Bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-md items-center relative"
          role="search"
        >
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search groceries, noodles, milk, stationery..."
            aria-label="Search groceries and daily essentials"
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-colors"
          />
        </form>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
          <Link to="/" className={navLinkClass('/')}>
            Home
          </Link>
          <Link to="/catalogue" className={navLinkClass('/catalogue')}>
            Catalogue
          </Link>
          <Link
            to="/catalogue?offers=1"
            className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              isOffersView ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Offers
          </Link>
          <Link to="/cart" className={navLinkClass('/cart')}>
            Cart
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap shrink-0 ${
                location.pathname === '/admin'
                  ? 'text-emerald-800'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {firebaseUser ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-3 sm:px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <User className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span className="max-w-[90px] truncate">{firstName}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('options')}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <User className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={openCartDrawer}
            aria-label={`Open shopping cart with ${cartTotals.itemCount} items`}
            className="relative inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            <span
              data-testid="navbar-cart-count"
              className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-md bg-emerald-900/60 px-1.5 text-xs font-bold tabular-nums"
            >
              {cartTotals.itemCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center" role="search">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search groceries & essentials..."
              aria-label="Search groceries"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </form>

          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              to="/catalogue"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Browse Catalogue
            </Link>
            <Link
              to="/catalogue?offers=1"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Special Offers
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Shopping Cart ({cartTotals.itemCount})
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              My Account &amp; Orders
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Admin Dashboard
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
