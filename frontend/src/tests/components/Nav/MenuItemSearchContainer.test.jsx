import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { vi } from "vitest";
import MenuItemSearchContainer from "main/components/Nav/MenuItemSearchContainer";

const axiosMock = new AxiosMockAdapter(axios);
const SEARCH_URL = "/api/diningcommons/menuitems/search";

const pizza = {
  id: 101,
  name: "Cheese Pizza",
  diningCommonsCode: "portola",
  mealCode: "lunch",
  station: "Pizza",
};

const salad = {
  id: 202,
  name: "Garden Salad",
  diningCommonsCode: "carrillo",
  mealCode: "dinner",
  station: "Salads",
};

function ReviewDestination() {
  const location = useLocation();
  return <div data-testid="review-destination">{location.pathname}</div>;
}

function renderSearch() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<MenuItemSearchContainer />} />
        <Route path="/reviews/:itemid" element={<ReviewDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

function type(text) {
  const input = screen.getByRole("combobox", { name: "Search menu items" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
}

describe("MenuItemSearchContainer", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
  });

  afterAll(() => axiosMock.restore());

  test("renders the search field without requesting data initially", () => {
    renderSearch();

    expect(
      screen.getByRole("combobox", { name: "Search menu items" }),
    ).toBeInTheDocument();

    expect(axiosMock.history.get).toHaveLength(0);
  });

  test("does not search for fewer than two characters", () => {
    renderSearch();
    type("p");

    expect(axiosMock.history.get).toHaveLength(0);
  });

  test("accepts an exactly two-character search", async () => {
    axiosMock.onGet(SEARCH_URL).reply(200, [pizza]);

    renderSearch();
    type("pi");

    expect(await screen.findByText("Cheese Pizza")).toBeInTheDocument();
    expect(axiosMock.history.get[0].params).toEqual({ q: "pi" });
  });

  test("searches the API using trimmed text and renders matches", async () => {
    axiosMock.onGet(SEARCH_URL).reply(200, [pizza]);

    renderSearch();
    type("  PI  ");

    expect(await screen.findByText("Cheese Pizza")).toBeInTheDocument();
    expect(screen.getByText("portola")).toBeInTheDocument();
    expect(axiosMock.history.get[0].params).toEqual({ q: "PI" });
  });

  test("navigates to the selected item's reviews", async () => {
    axiosMock.onGet(SEARCH_URL).reply(200, [pizza]);

    renderSearch();
    type("pizza");

    fireEvent.click(await screen.findByText("Cheese Pizza"));

    expect(await screen.findByTestId("review-destination")).toHaveTextContent(
      "/reviews/101",
    );
  });

  test("displays a loading state while the request is pending", async () => {
    let completeRequest;

    axiosMock.onGet(SEARCH_URL).reply(
      () =>
        new Promise((resolve) => {
          completeRequest = resolve;
        }),
    );

    renderSearch();
    type("pizza");

    expect(
      await screen.findByText("Searching menu items..."),
    ).toBeInTheDocument();

    await act(async () => completeRequest([200, [pizza]]));

    expect(await screen.findByText("Cheese Pizza")).toBeInTheDocument();
  });

  test("displays a clear error message when the API fails", async () => {
    axiosMock.onGet(SEARCH_URL).networkError();

    renderSearch();
    type("pizza");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to search menu items. Please try again.",
    );
  });

  test("displays an empty-results message when nothing matches", async () => {
    axiosMock.onGet(SEARCH_URL).reply(200, []);

    renderSearch();
    type("pizza");

    expect(
      await screen.findByText("No matching menu items found."),
    ).toBeInTheDocument();
  });

  test("clearing the query removes outdated results", async () => {
    axiosMock.onGet(SEARCH_URL).reply(200, [pizza]);

    renderSearch();
    type("pizza");

    expect(await screen.findByText("Cheese Pizza")).toBeInTheDocument();

    type("p");

    await waitFor(() => {
      expect(screen.queryByText("Cheese Pizza")).not.toBeInTheDocument();
      expect(
        screen.queryByText("No matching menu items found."),
      ).not.toBeInTheDocument();
    });

    expect(axiosMock.history.get).toHaveLength(1);
  });

  test("changing the query clears an error and loads new results", async () => {
    axiosMock.onGet(SEARCH_URL).reply((config) => {
      if (config.params.q === "pizza") return [500];
      return [200, [salad]];
    });

    renderSearch();
    type("pizza");

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    type("salad");

    expect(await screen.findByText("Garden Salad")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("ignores a response from an obsolete search", async () => {
    let resolveFirst;

    axiosMock.onGet(SEARCH_URL).reply((config) => {
      if (config.params.q === "pizza") {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }

      return [200, [salad]];
    });

    renderSearch();
    type("pizza");

    await waitFor(() => expect(resolveFirst).toBeDefined());

    type("salad");

    expect(await screen.findByText("Garden Salad")).toBeInTheDocument();

    await act(async () => resolveFirst([200, [pizza]]));

    expect(screen.queryByText("Cheese Pizza")).not.toBeInTheDocument();
  });

  test("ignores a successful response from an aborted request", async () => {
    let resolveOldRequest;

    const getSpy = vi.spyOn(axios, "get").mockImplementation((_, config) => {
      if (config.params.q === "pizza") {
        return new Promise((resolve) => {
          resolveOldRequest = resolve;
        });
      }

      return Promise.resolve({ data: [salad] });
    });

    try {
      renderSearch();

      // Start the first search.
      type("pizza");

      await waitFor(() => {
        expect(resolveOldRequest).toBeDefined();
      });

      // Change the query, aborting the first request.
      type("salad");

      expect(await screen.findByText("Garden Salad")).toBeInTheDocument();

      // Simulate an old request succeeding despite cancellation.
      await act(async () => {
        resolveOldRequest({ data: [pizza] });
      });

      // The obsolete response must not overwrite the current results.
      expect(screen.queryByText("Cheese Pizza")).not.toBeInTheDocument();
      expect(screen.getByText("Garden Salad")).toBeInTheDocument();
    } finally {
      getSpy.mockRestore();
    }
  });
});
