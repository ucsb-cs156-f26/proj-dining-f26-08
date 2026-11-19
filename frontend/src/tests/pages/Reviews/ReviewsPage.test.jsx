import { render, waitFor, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Route, Routes } from "react-router";
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
  });
  afterEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockClear();
  });

  const renderWithRoute = (itemid) => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/reviews/${itemid}`]}>
          <Routes>
            <Route path="/reviews/:itemid" element={<ReviewsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  test("renders empty table when backend is unavailable", async () => {
    const itemid = "7";
    setupUserOnly();
    axiosMock.onGet(`/api/reviews/approved/forItem/${itemid}`).timeout();
    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
      name: "Make Your Own Waffle (v)",
      diningCommonsCode: "carrillo",
    });

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
      .reply(200, [ReviewFixtures.oneReview]);

    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
      name: "Make Your Own Waffle (v)",
      diningCommonsCode: "carrillo",
    });

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

  test("title contains itemname and dininghall", async () => {
    const itemid = "7";
    setupUserOnly();
    const adapterSpy = vi.spyOn(axios.defaults, "adapter");
    axiosMock
      .onGet(`/api/reviews/approved/forItem/${itemid}`)
      .reply(200, [ReviewFixtures.oneReview]);

    axiosMock.onGet(`/api/diningcommons/menuitem?id=${itemid}`).reply(200, {
      name: "Make Your Own Waffle (v)",
      diningCommonsCode: "carrillo",
    });

    renderWithRoute(itemid);

    await waitFor(() => {
      expect(adapterSpy).toHaveBeenCalled();
      expect(adapterSpy.mock.calls[0][0].method).toBe("get");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Reviews for Make Your Own Waffle (v) at Carrillo",
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
      diningCommonsCode: "varrillo",
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
      );
    });
  });
});
