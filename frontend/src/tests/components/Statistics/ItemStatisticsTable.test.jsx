import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import userEvent from "@testing-library/user-event";
import ItemStatisticsTable from "main/components/Statistics/ItemStatisticsTable";
import { statisticsFixtures } from "fixtures/statisticsFixtures";

describe("ItemStatisticsTable tests", () => {
  test("renders all columns and data", () => {
    render(<ItemStatisticsTable items={statisticsFixtures.threeBestItems} />, {
      wrapper: MemoryRouter,
    });

    const testId = "ItemStatisticsTable";
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-itemName`),
    ).toHaveTextContent("Waffle");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-diningCommonsCode`),
    ).toHaveTextContent("carrillo");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-mealCode`),
    ).toHaveTextContent("breakfast");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-station`),
    ).toHaveTextContent("Bakery");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-averageStars`),
    ).toHaveTextContent("4.90");
    expect(
      screen.getByTestId(`${testId}-cell-row-0-col-reviewCount`),
    ).toHaveTextContent("12");

    expect(
      screen.getByTestId(`${testId}-cell-row-2-col-itemName`),
    ).toHaveTextContent("Pizza");
    expect(
      screen.getByTestId(`${testId}-cell-row-2-col-averageStars`),
    ).toHaveTextContent("4.20");
  });

  test("renders headers correctly", () => {
    render(<ItemStatisticsTable items={statisticsFixtures.threeBestItems} />, {
      wrapper: MemoryRouter,
    });

    expect(
      screen.getByTestId("ItemStatisticsTable-header-itemName"),
    ).toHaveTextContent("Item");
    expect(
      screen.getByTestId("ItemStatisticsTable-header-diningCommonsCode"),
    ).toHaveTextContent("Dining Commons");
    expect(
      screen.getByTestId("ItemStatisticsTable-header-mealCode"),
    ).toHaveTextContent("Meal");
    expect(
      screen.getByTestId("ItemStatisticsTable-header-station"),
    ).toHaveTextContent("Station");
    expect(
      screen.getByTestId("ItemStatisticsTable-header-averageStars"),
    ).toHaveTextContent("Average Score");
    expect(
      screen.getByTestId("ItemStatisticsTable-header-reviewCount"),
    ).toHaveTextContent("Reviews");
    expect(
      screen.getByTestId("ItemStatisticsTable-header-itemId"),
    ).toHaveTextContent("Comments");
  });

  test("accepts a custom testIdPrefix", () => {
    render(
      <ItemStatisticsTable
        items={statisticsFixtures.threeBestItems}
        testIdPrefix="CustomPrefix"
      />,
      { wrapper: MemoryRouter },
    );

    expect(
      screen.getByTestId("CustomPrefix-cell-row-0-col-itemName"),
    ).toHaveTextContent("Waffle");
  });
  test("opens the comments for the selected ranked item", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ItemStatisticsTable items={statisticsFixtures.threeBestItems} />
            }
          />
          <Route path="/reviews/2" element={<p>Soup comments</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "View reviews for Waffle" }),
    ).toHaveAttribute("href", "/reviews/1");
    await user.click(
      screen.getByRole("link", { name: "View reviews for Soup" }),
    );
    expect(screen.getByText("Soup comments")).toBeInTheDocument();
  });
});
