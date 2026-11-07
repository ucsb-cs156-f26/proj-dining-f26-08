import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router";
import AxiosMockAdapter from "axios-mock-adapter";
import axios from "axios";
import UsersIndexPage from "main/pages/Admin/UsersIndexPage";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import usersFixtures from "fixtures/usersFixtures";

describe("UsersIndexPage tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  const setup = () => {
    axiosMock.reset();
    axiosMock.resetHistory();

    axiosMock
      .onGet("/api/currentUser")
      .reply(200, apiCurrentUserFixtures.adminUser);

    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  };

  const mockPagedUsers = (allUsers) => {
    axiosMock.onGet("/api/admin/users/paged").reply((config) => {
      const page = Number(config.params?.page ?? 0);
      const size = Number(config.params?.size ?? 10);

      return [
        200,
        {
          content: allUsers.slice(page * size, (page + 1) * size),
          page: {
            totalPages: Math.ceil(allUsers.length / size),
          },
        },
      ];
    });
  };

  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UsersIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  const createUsers = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      email: `user${i + 1}@ucsb.edu`,
      givenName: `First${i + 1}`,
      familyName: `Last${i + 1}`,
      admin: false,
      moderator: false,
    }));

  test("renders without crashing", async () => {
    setup();
    mockPagedUsers([]);

    renderPage();

    expect(await screen.findByText("Users")).toBeInTheDocument();
  });

  test("renders three users in the table", async () => {
    setup();
    mockPagedUsers(usersFixtures.threeUsers);

    renderPage();

    expect(await screen.findByText("phtcon@ucsb.edu")).toBeInTheDocument();
    expect(screen.getByText("pconrad.cis@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("craig.zzyzx@example.org")).toBeInTheDocument();
  });

  test("page size selector has correct options", async () => {
    setup();
    mockPagedUsers([]);

    renderPage();

    const select = await screen.findByTestId("UsersIndexPage-pageSize");
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.value);

    expect(values).toEqual(["10", "25", "50", "100", "500"]);
  });

  test("paging works correctly", async () => {
    setup();
    mockPagedUsers(createUsers(15));

    renderPage();

    await screen.findByText("user1@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 1 of 2",
    );

    expect(screen.queryByText("user11@ucsb.edu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("UsersIndexPage-next"));

    await screen.findByText("user11@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 2 of 2",
    );

    expect(screen.queryByText("user1@ucsb.edu")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        axiosMock.history.get.some(
          (request) =>
            request.url === "/api/admin/users/paged" &&
            Number(request.params?.page) === 1 &&
            Number(request.params?.size) === 10,
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByTestId("UsersIndexPage-prev"));

    await screen.findByText("user1@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 1 of 2",
    );
  });

  test("prev button is disabled on first page", async () => {
    setup();
    mockPagedUsers(usersFixtures.threeUsers);

    renderPage();

    await screen.findByText("phtcon@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-prev")).toBeDisabled();
    expect(screen.getByTestId("UsersIndexPage-next")).toBeDisabled();
  });

  test("prev from page 3 goes to page 2 (not page 1)", async () => {
    setup();
    mockPagedUsers(createUsers(21));

    renderPage();

    await screen.findByText("user1@ucsb.edu");

    fireEvent.click(screen.getByTestId("UsersIndexPage-next"));
    await screen.findByText("user11@ucsb.edu");

    fireEvent.click(screen.getByTestId("UsersIndexPage-next"));
    await screen.findByText("user21@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 3 of 3",
    );

    fireEvent.click(screen.getByTestId("UsersIndexPage-prev"));

    await screen.findByText("user11@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 2 of 3",
    );

    expect(screen.queryByText("user1@ucsb.edu")).not.toBeInTheDocument();

    expect(screen.queryByText("user21@ucsb.edu")).not.toBeInTheDocument();
  });

  test("changing page size resets to first page", async () => {
    setup();
    mockPagedUsers(createUsers(15));

    renderPage();

    await screen.findByText("user1@ucsb.edu");

    fireEvent.click(screen.getByTestId("UsersIndexPage-next"));
    await screen.findByText("user11@ucsb.edu");

    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 2 of 2",
    );

    fireEvent.change(screen.getByTestId("UsersIndexPage-pageSize"), {
      target: { value: "25" },
    });

    await screen.findByText("user1@ucsb.edu");

    await waitFor(() => {
      expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
        "Page 1 of 1",
      );

      expect(
        axiosMock.history.get.some(
          (request) =>
            request.url === "/api/admin/users/paged" &&
            Number(request.params?.page) === 0 &&
            Number(request.params?.size) === 25,
        ),
      ).toBe(true);
    });

    expect(screen.getByText("user15@ucsb.edu")).toBeInTheDocument();
  });
  test("shows empty initial state while users are loading", () => {
    setup();

    // Keep the paged users request pending
    axiosMock
      .onGet("/api/admin/users/paged")
      .reply(() => new Promise(() => {}));

    renderPage();

    // Initial pagination should be displayed correctly
    expect(screen.getByTestId("UsersIndexPage-page-info")).toHaveTextContent(
      "Page 1 of 1",
    );

    // The table should not contain any user rows
    expect(screen.getAllByRole("row")).toHaveLength(1);

    // Next should be disabled when there are no pages
    expect(screen.getByTestId("UsersIndexPage-next")).toBeDisabled();
  });
});
