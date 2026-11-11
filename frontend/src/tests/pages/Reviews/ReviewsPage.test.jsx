import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import ReviewsPage from "main/pages/Reviews/ReviewsPage";
import { vi } from "vitest";

import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

const mockToast = vi.fn();
vi.mock("react-toastify", async () => {
  const originalModule = await vi.importActual("react-toastify");
  return {
    __esModule: true,
    ...originalModule,
    toast: (x) => mockToast(x),
  };
});

const axiosMock = new AxiosMockAdapter(axios);

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
    mockToast.mockClear();

    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  });

  afterEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
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

  test("renders empty table when backend is unavailable", async () => {
    const itemid = "7";
    setupUserOnly();
    axiosMock.onGet(`/api/reviews/approved/forItem/${itemid}`).timeout();

    // SPY ON THE ADAPTER, NOT axios.request
    const adapterSpy = vi.spyOn(axios.defaults, "adapter");

    renderWithRoute(itemid);

    await waitFor(() => {
      expect(adapterSpy).toHaveBeenCalled();
      expect(adapterSpy.mock.calls[0][0].method).toBe("get"); // MUTATION KILLER
    });

    await waitFor(() => {
      // Table should remain empty
      expect(
        screen.queryByTestId(`${testId}-cell-row-0-col-item.id`),
      ).not.toBeInTheDocument();
    });
  });

  test("renders table when backend is available", async () => {
    const itemid = "7";
    setupUserOnly();
    const adapterSpy = vi.spyOn(axios.defaults, "adapter");

    axiosMock
      .onGet(`/api/reviews/approved/forItem/${itemid}`)
      .reply(200, ReviewFixtures.threeReviews);

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
  });

  test("Error message includes GET method when request fails", async () => {
    const itemId = "7";
    setupUserOnly();

    axiosMock.onGet(`/api/reviews/approved/forItem/${itemId}`).networkError();

    renderWithRoute(itemId);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
      const toastMessage = mockToast.mock.calls[0][0];
      expect(toastMessage).toContain("GET");
      expect(toastMessage).toContain(`/api/reviews/approved/forItem/${itemId}`);
    });
  });

  test.each(["7", "42"])(
    "Review Item button navigates to the correct form for item %s",
    async (itemid) => {
      setupUserOnly();

      axiosMock
        .onGet(`/api/reviews/approved/forItem/${itemid}`)
        .reply(200, ReviewFixtures.threeReviews);

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
