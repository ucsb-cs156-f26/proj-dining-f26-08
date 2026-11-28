import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import ReviewsPage from "main/pages/Reviews/ReviewsPage";

import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import { vi } from "vitest";

const axiosMock = new AxiosMockAdapter(axios);

const mockToast = vi.fn();
vi.mock("react-toastify", async () => {
  const originalModule = await vi.importActual("react-toastify");
  return {
    __esModule: true,
    ...originalModule,
    toast: (x) => mockToast(x),
  };
});

// Helper component to verify navigation
const ReviewRoute = () => {
  const location = useLocation();
  return <div data-testid="review-route">{location.pathname}</div>;
};

describe("ReviewsPage tests", () => {
  const testId = "Reviewstable";

  const setupUserOnly = () => {
    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.userOnly);
  };

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
    mockToast.mockClear();
  });

  afterEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockClear();
    vi.restoreAllMocks();
  });

  const renderWithRoute = (itemid) => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/reviews/${itemid}`]}>
          <Routes>
            <Route path="/reviews/:itemid" element={<ReviewsPage />} />
            <Route path="/reviews/post/:id" element={<ReviewRoute />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  test("renders empty table when backend is unavailable, with itemname and dininghall in heading", async () => {
    const itemid = "72";
    setupUserOnly();

    axiosMock.onGet(`/api/reviews/approved/forItem/${itemid}`).reply(200, []);
    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
      name: "Long Grain Rice (vgn)",
      diningCommonsCode: "de-la-guerra",
    });

    const adapterSpy = vi.spyOn(axios.defaults, "adapter");

    renderWithRoute(itemid);

    await waitFor(() => {
      expect(adapterSpy).toHaveBeenCalled();
      expect(adapterSpy.mock.calls[0][0].method).toBe("get"); // MUTATION KILLER
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(`${testId}-cell-row-0-col-item.id`),
      ).not.toBeInTheDocument();
      // Table should remain empty
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Reviews for Long Grain Rice (vgn) at De La Guerra",
        }),
      ).toBeInTheDocument();
    });
  });

  test("renders table when backend is available, with itemname and dininghall in heading", async () => {
    const itemid = "7";
    setupUserOnly();

    axiosMock
      .onGet(`/api/reviews/approved/forItem/${itemid}`)
      .reply(200, [ReviewFixtures.oneReview]);

    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
      name: "Make Your Own Waffle (v)",
      diningCommonsCode: "carrillo",
    });

    const adapterSpy = vi.spyOn(axios.defaults, "adapter");

    renderWithRoute(itemid);

    await waitFor(() => {
      expect(adapterSpy).toHaveBeenCalled();
      expect(adapterSpy.mock.calls[0][0].method).toBe("get");
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(`${testId}-cell-row-0-col-item.id`),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Reviews for Make Your Own Waffle (v) at Carrillo",
        }),
      ).toBeInTheDocument();
    });
  });

  test("heading if GET single menu item by ID returns empty", async () => {
    const itemid = "7";
    setupUserOnly();

    axiosMock.onGet(`/api/reviews/approved/forItem/${itemid}`).reply(200, []);
    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {});

    renderWithRoute(itemid);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Reviews for at",
        }),
      ).toBeInTheDocument();
    });
  });

  test("Error message includes GET method when request fails", async () => {
    const itemid = "7";
    setupUserOnly();

    axiosMock.onGet(`/api/reviews/approved/forItem/${itemid}`).networkError();
    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
      name: "Make Your Own Waffle (v)",
      diningCommonsCode: "carrillo",
    });

    renderWithRoute(itemid);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();

      const toastMessages = mockToast.mock.calls.map((call) => call[0]);
      expect(
        toastMessages.some(
          (message) =>
            message.includes("GET") &&
            message.includes(`/api/reviews/approved/forItem/${itemid}`),
        ),
      ).toBe(true);
    });
  });

  test.each(["7", "42"])(
    "Review Item button navigates to the correct form for item %s",
    async (itemid) => {
      setupUserOnly();

      axiosMock.onGet(`/api/reviews/approved/forItem/${itemid}`).reply(200, []);
      axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
        name: "ItemName",
        diningCommonsCode: "DiningHall",
      });

      renderWithRoute(itemid);

      // Verify the Review Item button exists
      const reviewButton = screen.getByRole("button", {
        name: "Review Item",
      });

      expect(reviewButton).toBeInTheDocument();

      // Verify the button uses the correct styling
      expect(reviewButton).toHaveClass("btn-warning");

      // Click the Review Item button
      fireEvent.click(reviewButton);

      // Verify navigation to the correct item's review form
      expect(await screen.findByTestId("review-route")).toHaveTextContent(
        `/reviews/post/${itemid}`,
      );
    },
  );
});
