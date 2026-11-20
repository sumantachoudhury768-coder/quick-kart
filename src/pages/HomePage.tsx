import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ShieldCheck, Tag, Truck } from 'lucide-react';
import { CATEGORY_IMAGES } from '../data/seedCatalog';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { formatINR, FREE_DELIVERY_THRESHOLD } from '../utils/commerce';

export function HomePage() {
  const { categories, products, coupons, catalogLoading } = useStore();
  const { showToast } = useToast();

  const activeCategories = categories.filter((c) => c.isActive !== false);
  const featuredProducts = products.filter((p) => p.isFeatured).slice(0, 8);
  const featuredIds = new Set(featuredProducts.map((p) => p.id));

  const specialOfferProducts = [
    ...products.filter((p) => p.isSpecialOffer && !featuredIds.has(p.id)),
    ...products.filter((p) => p.isSpecialOffer && featuredIds.has(p.id)),
  ].slice(0, 4);
  const usedIds = new Set([...featuredIds, ...specialOfferProducts.map((p) => p.id)]);

  const recommendedProducts = [
    ...products.filter((p) => p.isRecommended && !usedIds.has(p.id)),
    ...products.filter((p) => p.isRecommended && usedIds.has(p.id)),
  ].slice(0, 4);
  const activeCoupons = coupons.filter((c) => c.isActive).slice(0, 3);

  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    showToast(`Coupon ${code} copied — apply it in your cart!`, 'success');
  };

  return (
    <div className="bg-white">
      {/* Hero Banner */}
      <section className="border-b border-slate-100 bg-gradient-to-b from-emerald-50/50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-emerald-800">
                Dehradun Express Grocery · 15–25 Min Doorstep Delivery
              </p>

              <h1
                className="mt-3 font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-slate-900 leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                Your Daily Needs, Delivered Fast.
              </h1>

              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Fresh groceries, hostel essentials and daily necessities delivered straight to your doorstep.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                <Link
                  to="/catalogue"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 shadow-sm transition-colors whitespace-nowrap"
                >
                  Browse Catalogue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/catalogue?offers=1"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  View Special Offers
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">15–25 Min Delivery</p>
                    <p className="mt-0.5 text-slate-500">Open 7 AM to 11 PM daily</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Truck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">Free Over {formatINR(FREE_DELIVERY_THRESHOLD)}</p>
                    <p className="mt-0.5 text-slate-500">Hostels, flats &amp; campuses</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">Pay on Delivery</p>
                    <p className="mt-0.5 text-slate-500">Freshness guaranteed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50">
                <ProductImage
                  src={CATEGORY_IMAGES.hero}
                  alt="Fresh groceries, vegetables, apples, whole-grain bread, and milk ready for QuickKart doorstep delivery"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories (All 8 Categories) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Popular Categories
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Shop across eight curated everyday aisles for hostel rooms and family kitchens.
            </p>
          </div>
          <Link
            to="/catalogue"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            All aisles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {activeCategories.map((category) => (
            <Link
              key={category.id}
              to={`/catalogue/${category.slug}`}
              className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50">
                <ProductImage
                  src={category.image}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-3.5">
                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {category.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="border-t border-slate-100 bg-slate-50/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-end justify-between gap-4 mb-7">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Featured Products
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Most-ordered fresh produce, dairy, instant meals, and staples this week.
              </p>
            </div>
            <Link
              to="/catalogue"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              View full catalogue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {catalogLoading && featuredProducts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl border border-slate-200 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Special Offers & Active Coupons */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Special Offers
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Student-friendly savings and bundle discounts ready to apply at checkout.
            </p>
          </div>
          <Link
            to="/catalogue?offers=1"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
          >
            All offers
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Coupon Strip */}
        {activeCoupons.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {activeCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <Tag className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span className="font-mono text-sm font-bold tracking-wide">
                      {coupon.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {coupon.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon(coupon.code)}
                  className="shrink-0 rounded-lg border border-emerald-700/30 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-700 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {specialOfferProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Recommended Products */}
      <section className="border-t border-slate-100 bg-slate-50/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-end justify-between gap-4 mb-7">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                Recommended for You
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Everyday favorites picked for busy study weeks and quick home cooking.
              </p>
            </div>
            <Link
              to="/catalogue"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              Shop everything
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
