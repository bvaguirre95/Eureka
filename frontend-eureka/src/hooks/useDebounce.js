import { useEffect, useState } from "react";

/**
 * Devuelve `value` retrasado `delay` ms. Útil para no disparar una
 * petición al backend en cada tecla al buscar.
 */
export const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
