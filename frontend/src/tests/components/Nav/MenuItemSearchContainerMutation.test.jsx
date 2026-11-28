import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import MenuItemSearch from "main/components/Nav/MenuItemSearch";
import MenuItemSearchContainer from "main/components/Nav/MenuItemSearchContainer";

// Expose the props passed to MenuItemSearch so they can be tested
vi.mock("main/components/Nav/MenuItemSearch", () => ({
  default: vi.fn(({ results, query, onQueryChange, isLoading, error }) => (
    <div>
      <input
        aria-label="Search menu items"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <output data-testid="search-results">{JSON.stringify(results)}</output>
      <output data-testid="search-loading">{String(isLoading)}</output>
      <output data-testid="search-error">{error ?? ""}</output>
    </div>
  )),
}));

const pizza = {
  id: 101,
  name: "Cheese Pizza",
  diningCommonsCode: "portola",
};

const salad = {
  id: 202,
  name: "Garden Salad",
  diningCommonsCode: "carrillo",
};

function renderSearch(Component = MenuItemSearchContainer) {
  render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

function type(text) {
  fireEvent.change(screen.getByRole("textbox", { name: "Search menu items" }), {
    target: { value: text },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("MenuItemSearchContainer state handling", () => {
  test("starts with an empty, idle search before and after effects run", () => {
    const getSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: [] });

    renderSearch();

    // Mount effects reset state, so also check the first render's props.
    expect(vi.mocked(MenuItemSearch).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        results: [],
        query: "",
        isLoading: false,
        error: null,
      }),
    );
    expect(
      screen.getByRole("textbox", { name: "Search menu items" }),
    ).toHaveValue("");
    expect(screen.getByTestId("search-results")).toHaveTextContent("[]");
    expect(screen.getByTestId("search-loading")).toHaveTextContent("false");
    expect(screen.getByTestId("search-error")).toBeEmptyDOMElement();
    expect(getSpy).not.toHaveBeenCalled();
  });

  test("requests the search endpoint with trimmed text and an abort signal", async () => {
    // Reload module-level configuration so this test checks the current URL.
    vi.resetModules();
    const { default: SearchContainer } =
      await import("main/components/Nav/MenuItemSearchContainer");
    const getSpy = vi.spyOn(axios, "get").mockResolvedValue({ data: [] });

    renderSearch(SearchContainer);
    type("  pi  ");

    expect(getSpy).toHaveBeenCalledExactlyOnceWith(
      "/api/diningcommons/menuitems/search",
      expect.objectContaining({
        params: { q: "pi" },
        signal: expect.any(AbortSignal),
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("search-loading")).toHaveTextContent("false");
    });
  });

  test("shortening a pending query aborts the request and resets the search", async () => {
    let resolveRequest;
    const getSpy = vi.spyOn(axios, "get").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderSearch();
    type("pizza");

    expect(screen.getByTestId("search-loading")).toHaveTextContent("true");

    type(" p ");

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.calls[0][1].signal.aborted).toBe(true);
    expect(screen.getByTestId("search-results")).toHaveTextContent("[]");
    expect(screen.getByTestId("search-loading")).toHaveTextContent("false");
    expect(screen.getByTestId("search-error")).toBeEmptyDOMElement();
    expect(
      screen.getByRole("textbox", { name: "Search menu items" }),
    ).toHaveValue("");

    await act(async () => {
      resolveRequest({ data: [pizza] });
    });

    expect(screen.getByTestId("search-results")).toHaveTextContent("[]");
    expect(screen.getByTestId("search-loading")).toHaveTextContent("false");
  });

  test("clears results and stops loading when a request fails", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(new Error("Network error"));

    renderSearch();
    type("pizza");

    await waitFor(() => {
      expect(screen.getByTestId("search-error")).toHaveTextContent(
        "Unable to search menu items. Please try again.",
      );
    });

    expect(screen.getByTestId("search-results")).toHaveTextContent("[]");
    expect(screen.getByTestId("search-loading")).toHaveTextContent("false");
  });

  test("clears old results immediately when the query changes", async () => {
    let resolveSecondRequest;

    vi.spyOn(axios, "get").mockImplementation((_, config) => {
      if (config.params.q === "pizza") {
        return Promise.resolve({ data: [pizza] });
      }

      return new Promise((resolve) => {
        resolveSecondRequest = resolve;
      });
    });

    renderSearch();
    type("pizza");

    await waitFor(() => {
      expect(screen.getByTestId("search-results").textContent).toBe(
        JSON.stringify([pizza]),
      );
    });

    // Begin a second search without completing its API request
    type("salad");

    await waitFor(() => {
      expect(resolveSecondRequest).toBeDefined();
    });

    // Old results must disappear immediately, even while loading
    expect(screen.getByTestId("search-results")).toHaveTextContent("[]");
    expect(screen.getByTestId("search-loading")).toHaveTextContent("true");

    await act(async () => {
      resolveSecondRequest({ data: [salad] });
    });

    expect(screen.getByTestId("search-results").textContent).toBe(
      JSON.stringify([salad]),
    );
  });

  test("ignores an error from a request aborted by a newer search", async () => {
    let rejectOldRequest;

    vi.spyOn(axios, "get").mockImplementation((_, config) => {
      if (config.params.q === "pizza") {
        return new Promise((_, reject) => {
          rejectOldRequest = reject;
        });
      }

      return Promise.resolve({ data: [salad] });
    });

    renderSearch();
    type("pizza");

    await waitFor(() => {
      expect(rejectOldRequest).toBeDefined();
    });

    // Start a newer search, this aborts the pizza request
    type("salad");

    await waitFor(() => {
      expect(screen.getByTestId("search-results").textContent).toBe(
        JSON.stringify([salad]),
      );
    });

    // The old request rejects despite being canceled
    await act(async () => {
      rejectOldRequest(new Error("Old request failed"));
    });

    // The obsolete error shouldn't overwrite the current search
    expect(screen.getByTestId("search-results").textContent).toBe(
      JSON.stringify([salad]),
    );
    expect(screen.getByTestId("search-error")).toBeEmptyDOMElement();
    expect(screen.getByTestId("search-loading")).toHaveTextContent("false");
  });
});
