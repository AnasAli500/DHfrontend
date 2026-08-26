import { Search } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-field pl-10"
    />
  </div>
);

export default SearchBar;
