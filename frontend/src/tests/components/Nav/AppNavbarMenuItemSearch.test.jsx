import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import AppNavbar from "main/components/Nav/AppNavbar";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

vi.mock("main/components/Nav/MenuItemSearchContainer", () => ({
  default: () => <div data-testid="navbar-menu-search">Menu item search</div>,
}));

function renderNavbar(currentUser) {
  render(
    <MemoryRouter>
      <AppNavbar
        currentUser={currentUser}
        systemInfo={systemInfoFixtures.showingNeither}
        doLogout={vi.fn()}
        currentUrl="https://example.com"
      />
    </MemoryRouter>,
  );
}

describe("AppNavbar menu search", () => {
  test("displays the search field for a logged-in user", () => {
    const loggedInUser = {
      ...apiCurrentUserFixtures.userOnly,
      loggedIn: true,
      root: {
        user: {
          email: "student@ucsb.edu",
        },
      },
    };

    renderNavbar(loggedInUser);

    expect(screen.getByTestId("navbar-menu-search")).toBeInTheDocument();

    expect(screen.getByText(/Welcome, student@ucsb.edu/)).toBeInTheDocument();
  });

  test("does not display the search field for a logged-out visitor", () => {
    renderNavbar(null);

    expect(screen.queryByTestId("navbar-menu-search")).not.toBeInTheDocument();
  });
});
