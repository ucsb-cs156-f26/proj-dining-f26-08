import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import MenuItemSearch from "main/components/Nav/MenuItemSearch";

const SEARCH_URL = "/api/diningcommons/menuitems/search";

/** Connects the menu item typeahead to the backend and review pages. */
export default function MenuItemSearchContainer() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const search = query.trim();

    if (search.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    axios
      .get(SEARCH_URL, {
        params: { q: search },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setResults(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResults([]);
          setError("Unable to search menu items. Please try again.");
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [query]);

  return (
    <MenuItemSearch
      results={results}
      query={query.trim().length >= 2 ? query : ""}
      onQueryChange={(value) => {
        setQuery(value);
        setResults([]);
      }}
      onSelect={(item) => navigate(`/reviews/${item.id}`)}
      isLoading={isLoading}
      error={error}
    />
  );
}
