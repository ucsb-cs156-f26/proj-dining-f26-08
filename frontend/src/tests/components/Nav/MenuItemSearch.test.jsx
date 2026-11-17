import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import MenuItemSearch from "main/components/Nav/MenuItemSearch";
import { menuItemSearchFixtures } from "fixtures/menuItemSearchFixtures";

const input = () => screen.getByRole("combobox", { name: "Search menu items" });

const typeQuery = (text) => {
  fireEvent.focus(input());
  fireEvent.change(input(), { target: { value: text } });
};

describe("MenuItemSearch", () => {
  test("renders an accessible search input", () => {
    render(<MenuItemSearch />);
    expect(input()).toBeInTheDocument();
    expect(input()).toHaveAttribute("placeholder", "Search menu items...");
  });

  test("notifies its parent when the query changes", () => {
    const onQueryChange = vi.fn();
    render(<MenuItemSearch onQueryChange={onQueryChange} />);
    typeQuery("pizza");
    expect(onQueryChange).toHaveBeenCalledWith("pizza");
  });

  test("does not require a query callback", () => {
    render(<MenuItemSearch />);
    expect(() => typeQuery("pizza")).not.toThrow();
  });

  test("displays menu item names and dining commons", async () => {
    render(<MenuItemSearch results={menuItemSearchFixtures.matches} />);
    typeQuery("pizza");
    expect(await screen.findByText("Cheese Pizza")).toBeInTheDocument();
    expect(screen.getByText("Portola")).toBeInTheDocument();
    expect(screen.getByText("Carrillo")).toBeInTheDocument();
    expect(screen.getByText("dlg")).toBeInTheDocument();
  });

  test("reports the selected menu item", async () => {
    const onSelect = vi.fn();
    render(
      <MenuItemSearch
        results={menuItemSearchFixtures.matches}
        onSelect={onSelect}
      />,
    );
    typeQuery("pizza");
    fireEvent.click(await screen.findByText("Cheese Pizza"));
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(menuItemSearchFixtures.matches[0]),
    );
  });

  test("selection works when there is no callback", async () => {
    render(<MenuItemSearch results={menuItemSearchFixtures.matches} />);
    typeQuery("pizza");
    fireEvent.click(await screen.findByText("Cheese Pizza"));
    expect(input()).toHaveValue("Cheese Pizza");
  });

  test("clearing a selection does not report a selected item", async () => {
    const onSelect = vi.fn();
    render(
      <MenuItemSearch
        results={menuItemSearchFixtures.matches}
        onSelect={onSelect}
      />,
    );
    typeQuery("pizza");
    fireEvent.click(await screen.findByText("Cheese Pizza"));
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    const clear = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clear);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("shows a loading message", () => {
    render(<MenuItemSearch query="pizza" isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching menu items...",
    );
    expect(
      screen.queryByText("No matching menu items found."),
    ).not.toBeInTheDocument();
  });

  test("shows a backend error", () => {
    render(<MenuItemSearch query="pizza" error="Service unavailable" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Error searching menu items: Service unavailable",
    );
    expect(
      screen.queryByText("No matching menu items found."),
    ).not.toBeInTheDocument();
  });

  test("shows empty results when the user has entered a query", () => {
    render(<MenuItemSearch query="pizza" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No matching menu items found.",
    );
  });

  test("does not show empty-results message when matches exist", () => {
    render(
      <MenuItemSearch query="pizza" results={menuItemSearchFixtures.matches} />,
    );
    expect(
      screen.queryByText("No matching menu items found."),
    ).not.toBeInTheDocument();
  });

  test("does not show empty-results message for blank query", () => {
    render(<MenuItemSearch query="  " />);
    expect(
      screen.queryByText("No matching menu items found."),
    ).not.toBeInTheDocument();
  });

  test("does not show empty results when query prop is omitted", () => {
    render(<MenuItemSearch />);

    expect(
      screen.queryByText("No matching menu items found."),
    ).not.toBeInTheDocument();
  });
});
