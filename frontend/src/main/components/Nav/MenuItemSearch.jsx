import { Typeahead } from "react-bootstrap-typeahead";
import "react-bootstrap-typeahead/css/Typeahead.css";

export default function MenuItemSearch({
  results = [],
  query = "",
  onQueryChange,
  onSelect,
  isLoading = false,
  error = null,
}) {
  return (
    <div data-testid="menu-item-search">
      <Typeahead
        id="menu-item-search-typeahead"
        inputProps={{ "aria-label": "Search menu items" }}
        minLength={2}
        labelKey="name"
        options={results}
        filterBy={() => true}
        clearButton
        placeholder="Search menu items..."
        emptyLabel="No matching menu items"
        onInputChange={(value) => onQueryChange?.(value)}
        onChange={(selected) => {
          if (selected.length > 0) {
            onSelect?.(selected[0]);
          }
        }}

        renderMenuItemChildren={(item) => (
          <div>
            <div>{item.name}</div>
            <small className="text-muted">
              {item.diningCommonsName ?? item.diningCommonsCode}
            </small>
          </div>
        )}
      />

      {isLoading && <div role="status">Searching menu items...</div>}
      {error && <div role="alert">Error searching menu items: {error}</div>}
      {!isLoading && !error && query.trim() && results.length === 0 && (
        <div role="status">No matching menu items found.</div>
      )}
    </div>
  );
}
