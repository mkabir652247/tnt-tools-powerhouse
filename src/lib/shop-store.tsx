import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Category, type Product } from "@/data/products";
import { loadStoreCatalog, loadStoreCategories } from "@/lib/catalog";

export type CartLine = { id: string; qty: number };

type ShopState = {
  cart: CartLine[];
  wishlist: string[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (id: string, qty?: number) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: number;
  subtotal: number;
  detailedCart: { product: Product; qty: number }[];
  lastOrder: { id: string; total: number } | null;
  placeOrder: (total: number) => string;
  catalogProducts: Product[];
  catalogCategories: Category[];
  catalogLoading: boolean;
  catalogError: boolean;
  catalogCategoriesLoading: boolean;
  catalogCategoriesError: boolean;
};

const ShopContext = createContext<ShopState | null>(null);

const CART_KEY = "tnt-cart";
const WISH_KEY = "tnt-wishlist";
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const CATEGORIES_QUERY_KEY = ["storefront", "categories"] as const;
const CATEGORIES_STALE_TIME = 5 * 60_000;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ShopProvider({
  children,
  loadCatalog = true,
}: {
  children: ReactNode;
  loadCatalog?: boolean;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ id: string; total: number } | null>(null);
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: loadStoreCategories,
    enabled: loadCatalog,
    staleTime: CATEGORIES_STALE_TIME,
  });
  const catalogQuery = useQuery({
    queryKey: ["storefront", "catalog"],
    queryFn: () =>
      loadStoreCatalog(
        queryClient.ensureQueryData({
          queryKey: CATEGORIES_QUERY_KEY,
          queryFn: loadStoreCategories,
          staleTime: CATEGORIES_STALE_TIME,
        }),
      ),
    enabled: loadCatalog,
    staleTime: 60_000,
  });
  const catalogProducts = catalogQuery.data?.products ?? EMPTY_PRODUCTS;
  const catalogCategories = categoriesQuery.data ?? EMPTY_CATEGORIES;

  useEffect(() => {
    setCart(read<CartLine[]>(CART_KEY, []));
    setWishlist(read<string[]>(WISH_KEY, []));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
    }
  }, [wishlist]);

  const addToCart = useCallback((id: string, qty = 1) => {
    setCart((prev) => {
      const found = prev.find((line) => line.id === id);
      if (found)
        return prev.map((line) => (line.id === id ? { ...line, qty: line.qty + qty } : line));
      return [...prev, { id, qty }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((line) => line.id !== id)
        : prev.map((line) => (line.id === id ? { ...line, qty } : line)),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const detailedCart = useMemo(
    () =>
      cart
        .map((line) => {
          const product = catalogProducts.find((item) => item.id === line.id);
          return product ? { product, qty: line.qty } : null;
        })
        .filter(Boolean) as { product: Product; qty: number }[],
    [cart, catalogProducts],
  );

  const subtotal = useMemo(
    () => detailedCart.reduce((sum, line) => sum + line.product.price * line.qty, 0),
    [detailedCart],
  );

  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.qty, 0), [cart]);

  const placeOrder = useCallback((total: number) => {
    const id = `TNT-${Math.floor(100000 + Math.random() * 899999)}`;
    setLastOrder({ id, total });
    setCart([]);
    return id;
  }, []);

  const value: ShopState = {
    cart,
    wishlist,
    cartOpen,
    setCartOpen,
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    toggleWishlist,
    isWishlisted: (id) => wishlist.includes(id),
    cartCount,
    subtotal,
    detailedCart,
    lastOrder,
    placeOrder,
    catalogProducts,
    catalogCategories,
    catalogLoading: catalogQuery.isLoading,
    catalogError: Boolean(catalogQuery.error),
    catalogCategoriesLoading: categoriesQuery.isLoading,
    catalogCategoriesError: Boolean(categoriesQuery.error),
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used inside ShopProvider");
  return context;
}
