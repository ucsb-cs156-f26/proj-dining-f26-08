import { render, screen } from "@testing-library/react";
import CommonsAveragesOverTimeGraph from "main/components/Statistics/CommonsAveragesOverTimeGraph";
import { statisticsFixtures } from "fixtures/statisticsFixtures";

describe("CommonsAveragesOverTimeGraph", () => {
  test("plots chronological monthly scores with labels, a legend, and review counts", () => {
    render(
      <CommonsAveragesOverTimeGraph
        rows={[...statisticsFixtures.commonsOverTime].reverse()}
      />,
    );
    const graph = screen.getByRole("img", {
      name: "Average review scores by dining commons over time",
    });
    expect(screen.getByText("Month served")).toBeInTheDocument();
    expect(screen.getByText("Average score")).toBeInTheDocument();
    expect(screen.getByText("carrillo")).toBeInTheDocument();
    expect(screen.getByText("ortega")).toBeInTheDocument();
    expect(
      screen.getByText("carrillo, 2025-03: 4.20 (5 reviews)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ortega, 2025-04: 4.60 (10 reviews)"),
    ).toBeInTheDocument();
    const points = graph.querySelectorAll("circle");
    expect(points).toHaveLength(3);
    expect(points[0]).toHaveAttribute("cx", "60");
    expect(points[0]).toHaveAttribute("cy", "84");
    expect(points[1]).toHaveAttribute("cx", "560");
    expect(points[1]).toHaveAttribute("cy", "106");
    expect(points[2]).toHaveAttribute("fill", "#a23b00");
    expect(graph.querySelectorAll("line")).toHaveLength(6);
  });

  test("centers a single month and uses the full 1 to 5 scale", () => {
    const { rerender } = render(
      <CommonsAveragesOverTimeGraph
        rows={[
          {
            diningCommonsCode: "portola",
            period: "2026-01",
            averageStars: 1,
            reviewCount: 1,
          },
        ]}
      />,
    );
    expect(screen.getByRole("img").querySelector("circle")).toHaveAttribute(
      "cx",
      "310",
    );
    expect(screen.getByRole("img").querySelector("circle")).toHaveAttribute(
      "cy",
      "260",
    );
    rerender(
      <CommonsAveragesOverTimeGraph
        rows={[
          {
            diningCommonsCode: "portola",
            period: "2026-01",
            averageStars: 5,
            reviewCount: 1,
          },
        ]}
      />,
    );
    expect(screen.getByRole("img").querySelector("circle")).toHaveAttribute(
      "cy",
      "40",
    );
  });

  test("spaces missing months proportionally and leaves gaps without inventing scores", () => {
    render(
      <CommonsAveragesOverTimeGraph
        rows={[
          {
            diningCommonsCode: "carrillo",
            period: "2025-12",
            averageStars: 2,
            reviewCount: 1,
          },
          {
            diningCommonsCode: "ortega",
            period: "2026-01",
            averageStars: 3,
            reviewCount: 1,
          },
          {
            diningCommonsCode: "carrillo",
            period: "2026-03",
            averageStars: 4,
            reviewCount: 1,
          },
        ]}
      />,
    );
    const graph = screen.getByRole("img");
    expect(graph.querySelectorAll("line")).toHaveLength(5);
    expect(screen.getByText("2026-01")).toHaveAttribute(
      "x",
      "226.66666666666666",
    );
    expect(graph.querySelectorAll("circle")).toHaveLength(3);
  });

  test("renders no graph when no monthly reviews exist", () => {
    render(<CommonsAveragesOverTimeGraph rows={[]} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
