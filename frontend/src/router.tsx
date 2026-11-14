import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode
} from "react";

interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

interface RouterValue {
  pathname: string;
  search: string;
  state: unknown;
  navigate(to: string, options?: NavigateOptions): void;
}

const RouterContext = createContext<RouterValue | null>(null);

function currentLocation(initialPath?: string) {
  if (initialPath) {
    const url = new URL(initialPath, "http://localhost");
    return { pathname: url.pathname, search: url.search, state: null as unknown };
  }
  return { pathname: window.location.pathname, search: window.location.search, state: history.state as unknown };
}

export function RouterProvider({ children, initialPath }: { children: ReactNode; initialPath?: string }) {
  const [location, setLocation] = useState(() => currentLocation(initialPath));

  useEffect(() => {
    const handlePopState = () => setLocation(currentLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, options: NavigateOptions = {}) => {
    const url = new URL(to, window.location.origin);
    if (options.replace) history.replaceState(options.state ?? null, "", `${url.pathname}${url.search}`);
    else history.pushState(options.state ?? null, "", `${url.pathname}${url.search}`);
    setLocation({ pathname: url.pathname, search: url.search, state: options.state ?? null });
    window.scrollTo?.({ top: 0, behavior: "auto" });
  }, []);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error("Router hook phải được dùng bên trong RouterProvider.");
  return value;
}

export function useNavigate() {
  return useRouter().navigate;
}

export function useSearchParams(): [URLSearchParams] {
  const { search } = useRouter();
  return useMemo(() => [new URLSearchParams(search)], [search]);
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  state?: unknown;
  replace?: boolean;
}

export function Link({ to, state, replace = false, onClick, children, ...props }: LinkProps) {
  const navigate = useNavigate();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to, { state, replace });
  };
  return <a {...props} href={to} onClick={handleClick}>{children}</a>;
}

export function Navigate({ to, replace = false, state }: { to: string; replace?: boolean; state?: unknown }) {
  const navigate = useNavigate();
  useEffect(() => navigate(to, { replace, state }), [navigate, replace, state, to]);
  return null;
}
