import React from "react";
import { Search } from "lucide-react";

export const SearchInput = ({ value, onChange, placeholder = "Buscar..." }) => (
  <div className="relative w-full sm:w-72">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
    />
  </div>
);

export default SearchInput;
