import { QueryClient, QueryClientProvider } from "react-query";
import { renderHook, waitFor, act } from "@testing-library/react";

import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import { vi } from "vitest";

vi.mock("react-router");

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

// Helpers used by the cache-invalidation tests
const createWrapper = () => {
  // See: https://react-query.tanstack.com/guides/testing#turn-off-retries
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const deleteReviewParams = (id) => ({
  url: "/api/reviews/delete",
  method: "DELETE",
  params: { id },
});

const isInvalidated = (queryClient, key) =>
  queryClient.getQueryState(key).isInvalidated;

describe("utils/useBackend tests", () => {
  let axiosMock;

  beforeEach(() => {
    vi.spyOn(console, "error");
    console.error.mockImplementation(() => null);
  });

  afterEach(() => {
    axiosMock?.restore();
    axiosMock = undefined;
    console.error.mockRestore();
    mockToast.mockClear();
  });

  describe("utils/useBackend useBackend tests", () => {
    test("useBackend returns data and status from a successful request", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      axiosMock = new AxiosMockAdapter(axios);
      const users = [{ id: 1, email: "cgaucho@ucsb.edu" }];

      axiosMock.onGet("/api/admin/users").reply(200, users);

      const { result } = renderHook(
        () =>
          useBackend(
            ["/api/admin/users"],
            { method: "GET", url: "/api/admin/users" },
            [],
          ),
        { wrapper },
      );

      // initialData [] makes isSuccess true before the fetch completes; wait for data
      await waitFor(() => {
        expect(result.current.data).toEqual(users);
      });

      expect(result.current.status).toBe(200);
    });

    test("useBackend handles 404 error correctly", async () => {
      // See: https://react-query.tanstack.com/guides/testing#turn-off-retries
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // ✅ turns retries off
            retry: false,
          },
        },
      });
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      axiosMock = new AxiosMockAdapter(axios);

      axiosMock.onGet("/api/admin/users").reply(404, {});

      const { result } = renderHook(
        () =>
          useBackend(
            ["/api/admin/users"],
            { method: "GET", url: "/api/admin/users" },
            ["initialData"],
          ),
        { wrapper },
      );

      await waitFor(() => result.current.isError);

      expect(result.current.data).toEqual(["initialData"]);
      await waitFor(() => expect(console.error).toHaveBeenCalled());
      const errorMessage = console.error.mock.calls[0][0];
      expect(errorMessage).toMatch(
        "Error communicating with backend via GET on /api/admin/users",
      );
    });
  });

  describe("utils/useBackend useBackendMutation tests", () => {
    test("useBackendMutation handles success correctly", async () => {
      // See: https://react-query.tanstack.com/guides/testing#turn-off-retries
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // ✅ turns retries off
            retry: false,
          },
        },
      });
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      axiosMock = new AxiosMockAdapter(axios);

      axiosMock.onPost("/api/recommendationrequest/post").reply(202, {
        id: 17,
        professorName: "test",
        professorEmail: "testemail@ucsb.edu",
        requesterName: "testname1",
        submissionDate: "2022-02-02T12:00",
        completionDate: "2022-02-02T12:00",
        status: "PENDING",
        details: "test details",
        recommendationTypes: "test",
      });

      const objectToAxiosParams = (request) => ({
        url: "/api/recommendationrequest/post",
        method: "POST",
        params: {
          professorName: request.professorName,
          professorEmail: request.professorEmail,
          requesterName: request.requesterName,
          submissionDate: request.submissionDate,
          completionDate: request.completionDate,
          status: request.status,
          details: request.details,
          recommendationTypes: request.recommendationTypes,
        },
      });

      const onSuccess = vi.fn().mockImplementation((request) => {
        mockToast(
          `New recommendation Created - id: ${request.id} requester name: ${request.requesterName}`,
        );
      });

      const { result } = renderHook(
        () =>
          useBackendMutation(objectToAxiosParams, { onSuccess }, [
            "/api/recommendationrequest/all",
          ]),
        { wrapper },
      );

      const mutation = result.current;
      act(() =>
        mutation.mutate({
          professorName: "test",
          professorEmail: "testemail@ucsb.edu",
          requesterName: "testname1",
          submissionDate: "2022-02-02T12:00",
          completionDate: "2022-02-02T12:00",
          status: "PENDING",
          details: "test details",
          recommendationTypes: "test",
        }),
      );

      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(mockToast).toHaveBeenCalledWith(
        "New recommendation Created - id: 17 requester name: testname1",
      );
    });
    test("useBackendMutation handles error correctly", async () => {
      // See: https://react-query.tanstack.com/guides/testing#turn-off-retries
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // ✅ turns retries off
            retry: false,
          },
        },
      });
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onPost("/api/recommendationrequest/post").reply(404);

      const objectToAxiosParams = (request) => ({
        url: "/api/recommendationrequest/post",
        method: "POST",
        params: {
          professorName: request.professorName,
          professorEmail: request.professorEmail,
          requesterName: request.requesterName,
          submissionDate: request.submissionDate,
          completionDate: request.completionDate,
          status: request.status,
          details: request.details,
          recommendationTypes: request.recommendationTypes,
        },
      });

      const onSuccess = vi.fn().mockImplementation((request) => {
        mockToast(
          `New recommendation Created - id: ${request.id} requester name: ${request.requesterName}`,
        );
      });

      const { result } = renderHook(
        () => useBackendMutation(objectToAxiosParams, { onSuccess }),
        { wrapper },
      );

      const mutation = result.current;

      mutation.mutate(
        {
          professorName: "test",
          professorEmail: "testemail@ucsb.edu",
          requesterName: "testname1",
          submissionDate: "2022-02-02T12:00",
          completionDate: "2022-02-02T12:00",
          status: "PENDING",
          details: "test details",
          recommendationTypes: "test",
        },
        {
          onError: (e) =>
            console.error(
              "onError from mutation.mutate called!",
              String(e).substring(0, 199),
            ),
        },
      );

      await waitFor(() => expect(mockToast).toHaveBeenCalled());

      // Collect all toast messages
      const toastCalls = mockToast.mock.calls.map((c) => c[0]);

      // Verify at least one contains "Axios Error"
      const axiosErrorToast = toastCalls.find((msg) =>
        msg.includes("Axios Error"),
      );
      expect(axiosErrorToast).toBeDefined();

      // Verify the message includes the actual status code
      expect(axiosErrorToast).toContain("Request failed with status code 404");

      // Verify the message is not empty
      expect(axiosErrorToast).not.toBe("");

      // NEW: Verify the second toast call contains the error data and is not empty
      const secondToastCall = mockToast.mock.calls[1][0];
      expect(secondToastCall).toContain(
        "Error: Request failed with status code 404",
      );
      expect(secondToastCall).not.toBe(""); // Must not be empty string

      expect(mockToast).toHaveBeenCalledWith(
        "Error: Request failed with status code 404",
      );

      expect(console.error).toHaveBeenCalledTimes(3);
      const errorMessage0 = console.error.mock.calls[0][0];
      expect(errorMessage0).toMatch(/Axios Error:/);
      const errorMessage1 = console.error.mock.calls[1][0];
      expect(errorMessage1.message).toMatch(
        /Request failed with status code 404/,
      );
      const errorMessage2 = console.error.mock.calls[2][0];
      expect(errorMessage2).toMatch(/onError from mutation.mutate called!/);
    });

    describe("cache invalidation", () => {
      test("useBackendMutation invalidates the cache after success", async () => {
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/recommendationrequest/all"], []);
        axiosMock.onPost("/api/recommendationrequest/post").reply(202, {});

        const { result } = renderHook(
          () =>
            useBackendMutation(
              () => ({
                url: "/api/recommendationrequest/post",
                method: "POST",
              }),
              {},
              ["/api/recommendationrequest/all"],
            ),
          { wrapper },
        );

        act(() => result.current.mutate({}));

        await waitFor(() =>
          expect(
            isInvalidated(queryClient, ["/api/recommendationrequest/all"]),
          ).toBe(true),
        );
      });

      test("invalidates every key in an array of keys, and only those keys", async () => {
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/reviews/userReviews"], []);
        queryClient.setQueryData(["/api/reviews/needsmoderation"], []);
        queryClient.setQueryData(["/api/reviews/unrelated"], []);

        axiosMock
          .onDelete("/api/reviews/delete")
          .reply(200, { message: "deleted" });

        const { result } = renderHook(
          () =>
            useBackendMutation(deleteReviewParams, {}, [
              "/api/reviews/userReviews",
              "/api/reviews/needsmoderation",
            ]),
          { wrapper },
        );

        act(() => result.current.mutate(7));

        await waitFor(() =>
          expect(isInvalidated(queryClient, ["/api/reviews/userReviews"])).toBe(
            true,
          ),
        );
        expect(
          isInvalidated(queryClient, ["/api/reviews/needsmoderation"]),
        ).toBe(true);
        // a key that was not passed must be left alone
        expect(isInvalidated(queryClient, ["/api/reviews/unrelated"])).toBe(
          false,
        );
      });

      test("treats a multi-element key array as separate keys, not one combined key", async () => {
        // Regression for the MyReviews page: invalidating the combined key
        // ["/api/reviews/userReviews", "/api/reviews/needsmoderation"] would NOT
        // match the query cached under ["/api/reviews/userReviews"].
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/reviews/userReviews"], []);
        axiosMock.onDelete("/api/reviews/delete").reply(200, {});

        const { result } = renderHook(
          () =>
            useBackendMutation(deleteReviewParams, {}, [
              "/api/reviews/userReviews",
              "/api/reviews/needsmoderation",
            ]),
          { wrapper },
        );

        act(() => result.current.mutate(7));

        await waitFor(() =>
          expect(isInvalidated(queryClient, ["/api/reviews/userReviews"])).toBe(
            true,
          ),
        );
      });

      test("invalidates keys even when the mutation fails", async () => {
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/reviews/userReviews"], []);
        queryClient.setQueryData(["/api/reviews/needsmoderation"], []);

        axiosMock.onDelete("/api/reviews/delete").reply(404);

        const { result } = renderHook(
          () =>
            useBackendMutation(deleteReviewParams, {}, [
              "/api/reviews/userReviews",
              "/api/reviews/needsmoderation",
            ]),
          { wrapper },
        );

        act(() => result.current.mutate(7));

        await waitFor(() => expect(mockToast).toHaveBeenCalled());
        expect(mockToast).toHaveBeenCalledWith(
          "Error: Request failed with status code 404",
        );
        await waitFor(() =>
          expect(isInvalidated(queryClient, ["/api/reviews/userReviews"])).toBe(
            true,
          ),
        );
        expect(
          isInvalidated(queryClient, ["/api/reviews/needsmoderation"]),
        ).toBe(true);
      });

      test("still invalidates when a caller-supplied onSuccess is passed", async () => {
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/reviews/userReviews"], []);
        axiosMock.onDelete("/api/reviews/delete").reply(200, {});

        const onSuccess = vi.fn();
        const { result } = renderHook(
          () =>
            useBackendMutation(deleteReviewParams, { onSuccess }, [
              "/api/reviews/userReviews",
            ]),
          { wrapper },
        );

        act(() => result.current.mutate(7));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        await waitFor(() =>
          expect(isInvalidated(queryClient, ["/api/reviews/userReviews"])).toBe(
            true,
          ),
        );
      });

      test("does not invalidate anything when the key is null", async () => {
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/reviews/userReviews"], []);
        axiosMock.onDelete("/api/reviews/delete").reply(200, {});

        const onSuccess = vi.fn();
        const { result } = renderHook(
          () => useBackendMutation(deleteReviewParams, { onSuccess }),
          { wrapper },
        );

        act(() => result.current.mutate(7));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(isInvalidated(queryClient, ["/api/reviews/userReviews"])).toBe(
          false,
        );
      });

      test("silently ignores a non-array (string) key", async () => {
        const { queryClient, wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        queryClient.setQueryData(["/api/reviews/userReviews"], []);
        axiosMock.onDelete("/api/reviews/delete").reply(200, {});

        const onSuccess = vi.fn();
        const { result } = renderHook(
          () =>
            useBackendMutation(
              deleteReviewParams,
              { onSuccess },
              "/api/reviews/userReviews",
            ),
          { wrapper },
        );

        act(() => result.current.mutate(7));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(isInvalidated(queryClient, ["/api/reviews/userReviews"])).toBe(
          false,
        );
      });

      test("an active useBackend query refetches after the mutation (table updates)", async () => {
        const { wrapper } = createWrapper();
        axiosMock = new AxiosMockAdapter(axios);

        const review = { id: 1, itemName: "Pancakes", reviewerComments: "ok" };

        // First GET returns the review, the GET after the delete returns nothing
        axiosMock
          .onGet("/api/reviews/userReviews")
          .replyOnce(200, [review])
          .onGet("/api/reviews/userReviews")
          .replyOnce(200, []);
        axiosMock.onDelete("/api/reviews/delete").reply(200, {});

        const { result } = renderHook(
          () => ({
            reviews: useBackend(
              ["/api/reviews/userReviews"],
              { method: "GET", url: "/api/reviews/userReviews" },
              [],
            ),
            deletion: useBackendMutation(deleteReviewParams, {}, [
              "/api/reviews/userReviews",
              "/api/reviews/needsmoderation",
            ]),
          }),
          { wrapper },
        );

        await waitFor(() =>
          expect(result.current.reviews.data).toEqual([review]),
        );

        act(() => result.current.deletion.mutate(1));

        // The delete invalidates the table's key, so the table re-fetches and
        // the deleted review disappears without a page refresh.
        await waitFor(() => expect(result.current.reviews.data).toEqual([]));
        expect(axiosMock.history.get.length).toBe(2);
        expect(axiosMock.history.delete.length).toBe(1);
      });
    });
  });
});
